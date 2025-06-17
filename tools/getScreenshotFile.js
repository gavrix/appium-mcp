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
 * @property {import('fs')} fs
 * @property {import('path')} path
 */

/**
 * Creates the definition for the "get_screenshot_file" tool.
 * Captures a screenshot of the current screen, saves it to a temp file, and returns the absolute path to that file.
 *
 * @param {SharedState} sharedState - An object to manage shared state like appiumDriver.
 * @param {ToolDependencies} dependencies - An object containing dependencies like logToFile, fs, and path.
 * @returns {{name: string, description: string, schema: object, handler: function(): Promise<object>}} The tool definition object.
 */
export function createGetScreenshotFileTool(sharedState, dependencies) {
  const { logToFile, fs, path } = dependencies;

  return {
    name: "get_screenshot_file",
    description: "Captures a screenshot of the current screen, saves it to a temp file, and returns the absolute path to that file.",
    schema: { /* No arguments needed */ },
    handler: async () => {
      if (!sharedState.appiumDriver) {
        return { content: [{ type: "text", text: "Error: Appium session not active. Please start a session first." }] };
      }
      try {
        logToFile("[get_screenshot_file] Attempting to take screenshot...");
        // @ts-ignore takeScreenshot is a valid command
        const screenshotBase64 = await sharedState.appiumDriver.takeScreenshot();
        logToFile("[get_screenshot_file] Screenshot taken successfully.");
        // Save to temp file
        const tempDir = process.env.TMPDIR || process.env.TEMP || process.env.TMP || "/tmp";
        const fileName = `appium-mcp-screenshot-${Date.now()}-${Math.floor(Math.random()*1e6)}.png`;
        const filePath = path.resolve(tempDir, fileName);
        fs.writeFileSync(filePath, screenshotBase64, 'base64');
        logToFile(`[get_screenshot_file] Screenshot saved to: ${filePath}`);
        return { content: [{ type: "text", text: filePath }] };
      } catch (error) {
        logToFile("[get_screenshot_file] Error taking screenshot:", error.message, error.stack);
        return { content: [{ type: "text", text: `Error taking screenshot: ${error.message}` }] };
      }
    }
  };
} 