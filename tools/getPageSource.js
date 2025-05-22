/**
 * @typedef {import('webdriverio').RemoteClient} WebdriverIoClient
 * @typedef {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} McpServer
 */

/**
 * @typedef {object} SharedState
 * @property {WebdriverIoClient | null} appiumDriver
 */

/**
 * @typedef {object} ToolDependencies
 * @property {function(string, ...any): void} logToFile
 */

/**
 * Creates the definition for the "get_page_source" tool.
 * Retrieves the XML source hierarchy of the current screen from the Appium session.
 *
 * @param {SharedState} sharedState - An object to manage shared state like appiumDriver.
 * @param {ToolDependencies} dependencies - An object containing dependencies like logToFile.
 * @returns {{name: string, description: string, schema: object, handler: function(): Promise<object>}} The tool definition object.
 */
export function createGetPageSourceTool(sharedState, dependencies) {
  const { logToFile } = dependencies;

  return {
    name: "get_page_source",
    description: "Retrieves the XML source hierarchy of the current screen from the Appium session.",
    schema: { /* No arguments needed */ },
    handler: async () => {
      if (!sharedState.appiumDriver) {
        return { content: [{ type: "text", text: "Error: Appium session not active. Please start a session first." }] };
      }
      try {
        logToFile("[get_page_source] Attempting to get page source...");
        // @ts-ignore getPageSource is a valid command
        const pageSource = await sharedState.appiumDriver.getPageSource();
        logToFile("[get_page_source] Page source retrieved successfully.");
        return { content: [{ type: "text", text: pageSource }] }; // Send the raw XML string
      } catch (error) {
        logToFile("[get_page_source] Error getting page source:", error.message, error.stack);
        return { content: [{ type: "text", text: `Error getting page source: ${error.message}` }] };
      }
    }
  };
} 