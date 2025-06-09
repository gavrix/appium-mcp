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
 * Creates the definition for the "get_element_text" tool.
 * Gets the text from an element, such as the current value of an input field.
 *
 * @param {SharedState} sharedState - An object to manage shared state like appiumDriver.
 * @param {ToolDependencies} dependencies - An object containing dependencies like logToFile and zod.
 * @returns {{name: string, description: string, schema: object, handler: function({elementId: string}): Promise<object>}} The tool definition object.
 */
export function createGetElementTextTool(sharedState, dependencies) {
  const { logToFile, zod: z } = dependencies;

  return {
    name: "get_element_text",
    description: "Gets the text from an element, such as the current value of an input field.",
    schema: {
      elementId: z.string().describe("The ID of the element to get text from (obtained from find_element).")
    },
    handler: async ({ elementId }) => {
      if (!sharedState.appiumDriver) {
        return { content: [{ type: "text", text: "Error: Appium session not active. Please start a session first." }] };
      }
      if (!elementId) {
        return { content: [{ type: "text", text: "Error: Element ID was not provided."}] };
      }

      try {
        logToFile(`[get_element_text] Attempting to get text from element with ID \'${elementId}\'`);
        // @ts-ignore getElementText is a valid command
        const text = await sharedState.appiumDriver.getElementText(elementId);
        logToFile(`[get_element_text] Successfully got text from element with ID \'${elementId}\'. Text: "${text}"`);
        return { content: [{ type: "text", text: text }] };
      } catch (error) {
        logToFile(`[get_element_text] Error getting text from element with ID \'${elementId}\': ${error.message}`, error.stack);
        return { content: [{ type: "text", text: `Error getting text from element with ID \'${elementId}\': ${error.message}` }] };
      }
    }
  };
} 