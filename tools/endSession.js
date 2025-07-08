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
 */

/**
 * Creates the definition for the "end_session" tool.
 * Ends the current Appium session.
 *
 * @param {SharedState} sharedState - An object to manage shared state like appiumDriver and deviceLogProcess.
 * @param {ToolDependencies} dependencies - An object containing dependencies like logToFile.
 * @returns {{name: string, description: string, schema: object, handler: function(): Promise<object>}} The tool definition object.
 */
export function createEndSessionTool(sharedState, dependencies) {
  const { logToFile } = dependencies;

  return {
    name: "end_session",
    description: "Ends the current Appium session.",
    schema: {/* No specific arguments needed */},
    handler: async () => {
      if (sharedState.appiumDriver) {
        try {
          const platformName = sharedState.currentPlatform || 'device';
          logToFile(`[end_session] Attempting to delete ${platformName} Appium session.`);
          // @ts-ignore deleteSession is a valid command
          await sharedState.appiumDriver.deleteSession();
          sharedState.appiumDriver = null;
          sharedState.currentPlatform = null;
          sharedState.currentDevice = null;
          logToFile(`[end_session] ${platformName} Appium session deleted successfully.`);
          
          // Terminate device log capture process
          if (sharedState.deviceLogProcess) {
            logToFile(`[end_session] Terminating ${platformName} log capture process.`);
            try {
              sharedState.deviceLogProcess.kill('SIGTERM'); 
            } catch (killError) {
                logToFile(`[end_session] Error terminating ${platformName} log process:`, killError.message);
            }
            sharedState.deviceLogProcess = null;
            logToFile(`[end_session] ${platformName} log capture process terminated.`);
          }

          return { content: [{ type: "text", text: "Appium session ended." }] };
        } catch (error) {
          logToFile('[end_session] Error ending Appium session:', error.message, error.stack);
          sharedState.appiumDriver = null; // Ensure driver is cleared even on error
          sharedState.currentPlatform = null;
          sharedState.currentDevice = null;
          
          // Ensure log process is also cleared if session end fails
          if (sharedState.deviceLogProcess) {
            logToFile('[end_session] Terminating device log capture process due to session end error.');
            try {
              sharedState.deviceLogProcess.kill('SIGTERM');
            } catch (killError) {
                logToFile('[end_session] Error terminating device log process during error handling:', killError.message);
            }
            sharedState.deviceLogProcess = null;
          }
          return { content: [{ type: "text", text: `Error ending Appium session: ${error.message}` }] };
        }
      } else {
        logToFile('[end_session] No active Appium session to end.');
        return { content: [{ type: "text", text: "No active Appium session to end." }] };
      }
    }
  };
} 