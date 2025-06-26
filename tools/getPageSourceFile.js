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
 * Creates the definition for the "get_page_source_file" tool.
 * Retrieves the XML source hierarchy of the current screen, saves it to a temp file, and returns the absolute path.
 *
 * @param {SharedState} sharedState - An object to manage shared state like appiumDriver.
 * @param {ToolDependencies} dependencies - An object containing dependencies like logToFile, fs, and path.
 * @returns {{name: string, description: string, schema: object, handler: function(): Promise<object>}} The tool definition object.
 */
export function createGetPageSourceFileTool(sharedState, dependencies) {
  const { logToFile, fs, path } = dependencies;

  return {
    name: "get_page_source_file",
    description: "Retrieves the XML source hierarchy of the current screen, saves it to a temp file, and returns the absolute path.",
    schema: { /* No arguments needed */ },
    handler: async () => {
      if (!sharedState.appiumDriver) {
        return { content: [{ type: "text", text: "Error: Appium session not active. Please start a session first." }] };
      }
      try {
        logToFile("[get_page_source_file] Attempting to get page source...");
        // @ts-ignore getPageSource is a valid command
        const pageSource = await sharedState.appiumDriver.getPageSource();
        logToFile("[get_page_source_file] Page source retrieved successfully.");
        
        // Save to temp file
        const tempDir = process.env.TMPDIR || process.env.TEMP || process.env.TMP || "/tmp";
        const fileName = `appium-mcp-pagesource-${Date.now()}-${Math.floor(Math.random()*1e6)}.xml`;
        const filePath = path.resolve(tempDir, fileName);
        fs.writeFileSync(filePath, pageSource, 'utf8');
        logToFile(`[get_page_source_file] Page source saved to: ${filePath}`);

        return { content: [{ type: "text", text: filePath }] };
      } catch (error) {
        logToFile("[get_page_source_file] Error getting page source:", error.message, error.stack);
        return { content: [{ type: "text", text: `Error getting page source: ${error.message}` }] };
      }
    }
  };
} 