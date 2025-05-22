/**
 * @typedef {import('webdriverio').RemoteClient} WebdriverIoClient
 * @typedef {import('child_process').ChildProcess} ChildProcess
 * @typedef {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} McpServer
 */

/**
 * @typedef {object} SharedState
 * @property {WebdriverIoClient | null} appiumDriver
 * @property {ChildProcess | null} deviceLogProcess
 */

/**
 * @typedef {object} ToolDependencies
 * @property {function(string, ...any): void} logToFile
 * @property {import('fs/promises')} fsPromises
 * @property {string} deviceLogFilePath
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
  const { logToFile, fsPromises, deviceLogFilePath, fs } = dependencies;

  return {
    name: "get_device_logs",
    description: "Retrieves console logs from the connected device/simulator since the last call. The log buffer is cleared after retrieval.",
    schema: { /* No arguments for now */ },
    handler: async () => {
      if (!sharedState.appiumDriver) {
        return { content: [{ type: "text", text: "Error: Appium session not active. Please start a session first." }] };
      }
      
      let logFileExists = false;
      try {
        await fsPromises.access(deviceLogFilePath, fs.constants.F_OK);
        logFileExists = true;
      } catch (e) {
        // File does not exist
      }

      if (!sharedState.deviceLogProcess && !logFileExists) {
          logToFile('[get_device_logs] Device log capture is not active and no log file found.');
          return { content: [{ type: "text", text: "Device log capture is not active or no logs have been captured yet."}] };
      }

      try {
        logToFile('[get_device_logs] Attempting to read device logs from:', deviceLogFilePath);
        const logs = await fsPromises.readFile(deviceLogFilePath, 'utf8');
        
        if (logs.trim() === "") {
          logToFile('[get_device_logs] Device log file is empty.');
          return { content: [{ type: "text", text: "No new device logs since last retrieval." }] };
        }

        logToFile('[get_device_logs] Successfully read device logs. Clearing log file for next retrieval.');
        
        try {
          await fsPromises.truncate(deviceLogFilePath, 0);
          logToFile('[get_device_logs] Device log file truncated.');
        } catch (truncError) {
          logToFile('[get_device_logs] Warning: Could not truncate device log file:', truncError.message, '. Logs might be duplicated on next call.');
        }

        return { content: [{ type: "text", text: logs }] };
      } catch (error) {
        if (error.code === 'ENOENT') {
          logToFile('[get_device_logs] Device log file not found. It might not have been created yet or was deleted.');
          return { content: [{ type: "text", text: "Device log file not found. No logs to retrieve." }] };
        }
        logToFile('[get_device_logs] Error reading device logs:', error.message, error.stack);
        return { content: [{ type: "text", text: `Error reading device logs: ${error.message}` }] };
      }
    }
  };
} 