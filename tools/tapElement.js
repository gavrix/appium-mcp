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
 * Creates the definition for the "tap_element" tool.
 * Taps or clicks an element identified by its unique element ID.
 *
 * @param {SharedState} sharedState - An object to manage shared state like appiumDriver.
 * @param {ToolDependencies} dependencies - An object containing dependencies like logToFile and zod.
 * @returns {{name: string, description: string, schema: object, handler: function({elementId: string}): Promise<object>}} The tool definition object.
 */
export function createTapElementTool(sharedState, dependencies) {
  const { logToFile, zod: z } = dependencies;

  return {
    name: "tap_element",
    description: "Taps or clicks an element identified by its unique element ID.",
    schema: { 
      elementId: z.string().describe("The ID of the element to tap (obtained from find_element).")
    },
    handler: async ({ elementId }) => {
      if (!sharedState.appiumDriver) {
        return { content: [{ type: "text", text: "Error: Appium session not active. Please start a session first." }] };
      }
      if (!elementId) {
        return { content: [{ type: "text", text: "Error: Element ID was not provided."}] };
      }
      try {
        logToFile(`[tap_element] Attempting to tap element with ID \'${elementId}\'`);
        // @ts-ignore elementClick is a valid command
        await sharedState.appiumDriver.elementClick(elementId);
        logToFile(`[tap_element] Element with ID \'${elementId}\' tapped successfully.`);
        return { content: [{ type: "text", text: `Element with ID \'${elementId}\' tapped successfully.` }] };
      } catch (error) {
        logToFile(`[tap_element] Error tapping element with ID \'${elementId}\': ${error.message}`, error.stack);
        return { content: [{ type: "text", text: `Error tapping element with ID \'${elementId}\': ${error.message}` }] };
      }
    }
  };
} 