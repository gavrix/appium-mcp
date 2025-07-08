/**
 * @typedef {import('webdriverio').RemoteClient} WebdriverIoClient
 * @typedef {import('child_process').ChildProcess} ChildProcess
 * @typedef {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} McpServer
 */

/**
 * @typedef {object} SharedState
 * @property {WebdriverIoClient | null} appiumDriver
 * @property {ChildProcess | null} deviceLogProcess
 * @property {string | null} currentPlatform - 'ios' | 'android' | null
 * @property {object | null} currentDevice - Device info object
 */

/**
 * @typedef {object} ToolDependencies
 * @property {function(string, ...any): void} logToFile
 * @property {import('fs/promises')} fsPromises
 * @property {string} deviceLogFilePath
 * @property {string} androidLogFilePath
 * @property {import('fs')} fs // For fs.constants
 */

/**
 * Creates the definition for the "get_device_logs" tool.
 * Retrieves console logs from the connected device/simulator since the last call.
 *
 * @param {SharedState} sharedState - An object to manage shared state.
 * @param {ToolDependencies} dependencies - An object containing dependencies.
 * @returns {{name: string, description: string, schema: object, handler: function(): Promise<object>}} The tool definition object.
 */
export function createGetDeviceLogsTool(sharedState, dependencies) {
  const { logToFile, fsPromises, deviceLogFilePath, androidLogFilePath, fs } = dependencies;

  return {
    name: "get_device_logs",
    description: "Retrieves console logs from the connected device/simulator since the last call. The log buffer is cleared after retrieval.",
    schema: { /* No arguments for now */ },
    handler: async () => {
      if (!sharedState.appiumDriver) {
        return { content: [{ type: "text", text: "Error: Appium session not active. Please start a session first." }] };
      }

      // Determine which log file to use based on platform
      const logFilePath = sharedState.currentPlatform === 'android' ? androidLogFilePath : deviceLogFilePath;
      const platformName = sharedState.currentPlatform || 'device';
      
      let logFileExists = false;
      try {
        await fsPromises.access(logFilePath, fs.constants.F_OK);
        logFileExists = true;
      } catch (e) {
        // File does not exist
      }

      if (!sharedState.deviceLogProcess && !logFileExists) {
          logToFile(`[get_device_logs] ${platformName} log capture is not active and no log file found.`);
          return { content: [{ type: "text", text: `${platformName} log capture is not active or no logs have been captured yet.`}] };
      }

      try {
        logToFile(`[get_device_logs] Attempting to read ${platformName} logs from:`, logFilePath);
        const logs = await fsPromises.readFile(logFilePath, 'utf8');
        
        if (logs.trim() === "") {
          logToFile(`[get_device_logs] ${platformName} log file is empty.`);
          return { content: [{ type: "text", text: `No new ${platformName} logs since last retrieval.` }] };
        }

        logToFile(`[get_device_logs] Successfully read ${platformName} logs. Clearing log file for next retrieval.`);
        
        try {
          await fsPromises.truncate(logFilePath, 0);
          logToFile(`[get_device_logs] ${platformName} log file truncated.`);
        } catch (truncError) {
          logToFile(`[get_device_logs] Warning: Could not truncate ${platformName} log file:`, truncError.message, '. Logs might be duplicated on next call.');
        }

        return { content: [{ type: "text", text: logs }] };
      } catch (error) {
        if (error.code === 'ENOENT') {
          logToFile(`[get_device_logs] ${platformName} log file not found. It might not have been created yet or was deleted.`);
          return { content: [{ type: "text", text: `${platformName} log file not found. No logs to retrieve.` }] };
        }
        logToFile(`[get_device_logs] Error reading ${platformName} logs:`, error.message, error.stack);
        return { content: [{ type: "text", text: `Error reading ${platformName} logs: ${error.message}` }] };
      }
    }
  };
} 