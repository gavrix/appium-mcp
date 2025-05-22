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
 * Creates the definition for the "get_screenshot" tool.
 * Captures a screenshot of the current screen and returns it as a base64 encoded string.
 *
 * @param {SharedState} sharedState - An object to manage shared state like appiumDriver.
 * @param {ToolDependencies} dependencies - An object containing dependencies like logToFile.
 * @returns {{name: string, description: string, schema: object, handler: function(): Promise<object>}} The tool definition object.
 */
export function createGetScreenshotTool(sharedState, dependencies) {
  const { logToFile } = dependencies;

  return {
    name: "get_screenshot",
    description: "Captures a screenshot of the current screen and returns it as a base64 encoded string.",
    schema: { /* No arguments needed */ },
    handler: async () => {
      if (!sharedState.appiumDriver) {
        return { content: [{ type: "text", text: "Error: Appium session not active. Please start a session first." }] };
      }
      try {
        logToFile("[get_screenshot] Attempting to take screenshot...");
        // @ts-ignore takeScreenshot is a valid command
        const screenshotBase64 = await sharedState.appiumDriver.takeScreenshot();
        logToFile("[get_screenshot] Screenshot taken successfully.");
        return { content: [{ type: "text", text: screenshotBase64 }] };
      } catch (error) {
        logToFile("[get_screenshot] Error taking screenshot:", error.message, error.stack);
        return { content: [{ type: "text", text: `Error taking screenshot: ${error.message}` }] };
      }
    }
  };
} 