/**
 * @typedef {import('webdriverio').RemoteClient} WebdriverIoClient
 * @typedef {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} McpServer
 * @typedef {import('zod').ZodTypeAny} ZodTypeAny
 * @typedef {import('zod').z} ZodInstance
 */

/**
 * @typedef {object} SharedState
 * @property {WebdriverIoClient | null} appiumDriver
 */

/**
 * @typedef {object} ToolDependencies
 * @property {function(string, ...any): void} logToFile
 * @property {ZodInstance} zod // Zod instance for schema validation
 */

/**
 * Creates the definition for the "find_element" tool.
 * Finds a UI element on the current screen using a specified strategy and selector.
 *
 * @param {SharedState} sharedState - An object to manage shared state like appiumDriver.
 * @param {ToolDependencies} dependencies - An object containing dependencies like logToFile and zod.
 * @returns {{name: string, description: string, schema: object, handler: function({strategy: string, selector: string}): Promise<object>}} The tool definition object.
 */
export function createFindElementTool(sharedState, dependencies) {
  const { logToFile, zod: z } = dependencies;

  const findElementStrategies = z.enum([
    "id", 
    "accessibility id",
    "xpath",
    "class name", 
    "name", 
    "-ios class chain",
    "-ios predicate string",
    "-android uiautomator" 
  ]).describe("The strategy to use for finding the element.");

  return {
    name: "find_element",
    description: "Finds a UI element on the current screen using a specified strategy and selector, and returns its ID.",
    schema: {
      strategy: findElementStrategies,
      selector: z.string().describe(`The selector string corresponding to the chosen strategy (e.g., 'myButtonAccessibilityID', '//XCUIElementTypeButton[@name="Login"]')`),
    },
    handler: async ({ strategy, selector }) => {
      if (!sharedState.appiumDriver) {
        return { content: [{ type: "text", text: "Error: Appium session not active. Please start a session first." }] };
      }
      try {
        logToFile(`[find_element] Attempting to find element with strategy '${strategy}' and selector '${selector}'`);
        // @ts-ignore findElement is a valid command
        const element = await sharedState.appiumDriver.findElement(strategy, selector);
        
        if (element) {
          logToFile('[SERVER_DEBUG] Raw element object from WebdriverIO:', element);
        }

        // WebdriverIO v7/v8 uses 'elementId', older versions or other drivers might use 'ELEMENT' or 'value.ELEMENT'
        const elementId = element ? (element.elementId || element.ELEMENT || (element.value && element.value.ELEMENT)) : null;

        if (elementId) { 
          logToFile(`[find_element] Element found with ID: ${elementId}`);
          return { 
            content: [
              { type: "text", text: `Element found. ID: ${elementId}` } 
            ]
          };
        } else {
          logToFile(`[find_element] Element not found with strategy '${strategy}' and selector '${selector}' (element object did not yield an ID). Inspected element:`, element);
          return { 
            content: [
              { type: "text", text: `Element not found with strategy '${strategy}' and selector '${selector}'.` }
            ]
          };
        }
      } catch (error) {
        logToFile(`[find_element] Error finding element: ${error.message}`, error);
        return { content: [{ type: "text", text: `Error finding element with strategy '${strategy}' and selector '${selector}': ${error.message}` }] };
      }
    }
  };
} 