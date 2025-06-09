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
 * Creates the definition for the "enter_text" tool.
 * Enters text into a specific element, like an input field.
 * This is equivalent to clearing the field and then typing into it.
 *
 * @param {SharedState} sharedState - An object to manage shared state like appiumDriver.
 * @param {ToolDependencies} dependencies - An object containing dependencies like logToFile and zod.
 * @returns {{name: string, description: string, schema: object, handler: function({elementId: string, text: string}): Promise<object>}} The tool definition object.
 */
export function createEnterTextTool(sharedState, dependencies) {
  const { logToFile, zod: z } = dependencies;

  return {
    name: "enter_text",
    description: "Sets the value of an element, clearing its contents first (e.g., an input field).",
    schema: {
      elementId: z.string().describe("The ID of the element to enter text into (obtained from find_element)."),
      text: z.string().describe("The text to enter into the element."),
    },
    handler: async ({ elementId, text }) => {
      if (!sharedState.appiumDriver) {
        return { content: [{ type: "text", text: "Error: Appium session not active. Please start a session first." }] };
      }
      if (!elementId) {
        return { content: [{ type: "text", text: "Error: Element ID was not provided."}] };
      }
      if (typeof text === 'undefined') {
        return { content: [{ type: "text", text: "Error: Text to enter was not provided."}] };
      }

      try {
        logToFile(`[enter_text] Attempting to set value for element with ID \'${elementId}\'`);
        // Implement "setValue" by clearing the element first, then sending keys.
        // @ts-ignore elementClear is a valid command
        await sharedState.appiumDriver.elementClear(elementId);
        // @ts-ignore elementSendKeys is a valid command
        await sharedState.appiumDriver.elementSendKeys(elementId, text);
        logToFile(`[enter_text] Value set for element with ID \'${elementId}\' successfully.`);
        return { content: [{ type: "text", text: `Value set for element with ID \'${elementId}\' successfully.` }] };
      } catch (error) {
        logToFile(`[enter_text] Error setting value for element with ID \'${elementId}\': ${error.message}`, error.stack);
        return { content: [{ type: "text", text: `Error setting value for element with ID \'${elementId}\': ${error.message}` }] };
      }
    }
  };
} 