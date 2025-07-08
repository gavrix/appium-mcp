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
 * Creates the definition for the "launch_app" tool.
 * Launches an application on the active Appium session using its identifier.
 * For iOS: use bundle ID (e.g., 'com.apple.mobilesafari')
 * For Android: use package name (e.g., 'com.android.chrome')
 * If the app is already running, it will be terminated and then relaunched.
 *
 * @param {SharedState} sharedState - An object to manage shared state like appiumDriver.
 * @param {ToolDependencies} dependencies - An object containing dependencies like logToFile and zod.
 * @returns {{name: string, description: string, schema: object, handler: function({bundleId: string}): Promise<object>}} The tool definition object.
 */
export function createLaunchAppTool(sharedState, dependencies) {
  const { logToFile, zod: z } = dependencies;

  return {
    name: "launch_app",
    description: "Launches an application on the active Appium session using its identifier. For iOS use bundle ID (e.g., 'com.apple.mobilesafari'), for Android use package name (e.g., 'com.android.chrome'). If the app is already running, it will be terminated and then relaunched.",
    schema: { 
      bundleId: z.string().describe("The app identifier: bundle ID for iOS (e.g., 'com.apple.mobilesafari') or package name for Android (e.g., 'com.android.chrome')") 
    },
    handler: async ({ bundleId }) => {
      if (!sharedState.appiumDriver) {
        return { content: [{ type: "text", text: "Error: Appium session not active. Please start a session first." }] };
      }
      try {
        logToFile(`[launch_app] Received request to launch app with bundleId: ${bundleId}`);

        // @ts-ignore queryAppState is a valid command
        const appState = await sharedState.appiumDriver.queryAppState(bundleId);
        logToFile(`[launch_app] Current app state for ${bundleId}: ${appState}`);

        // App state 4 is RUNNING_IN_FOREGROUND. State 3 is RUNNING_IN_BACKGROUND. State 2 is RUNNING_IN_BACKGROUND_SUSPENDED. State 1 is NOT_RUNNING.
        if (appState > 1) { // App is running in some capacity (foreground, background, suspended)
          logToFile(`[launch_app] App ${bundleId} is currently running (state: ${appState}). Terminating before relaunch.`);
          try {
            // @ts-ignore terminateApp is a valid command
            await sharedState.appiumDriver.terminateApp(bundleId);
            logToFile(`[launch_app] App ${bundleId} terminated successfully.`);
          } catch (termError) {
            logToFile(`[launch_app] Warning: Could not terminate app ${bundleId} (state: ${appState}): ${termError.message}. Proceeding with launch attempt.`);
          }
        }

        logToFile(`[launch_app] Attempting to launch/activate app with bundleId: ${bundleId}`);
        // @ts-ignore activateApp is a valid command
        await sharedState.appiumDriver.activateApp(bundleId);
        logToFile(`[launch_app] App ${bundleId} launched/activated successfully.`);
        return { content: [{ type: "text", text: `App with bundleId '${bundleId}' launched/activated successfully (restarted if previously running).` }] };
      } catch (error) {
        logToFile(`[launch_app] Error during launch process for app ${bundleId}:`, error.message, error.stack);
        return { content: [{ type: "text", text: `Error launching app '${bundleId}': ${error.message}` }] };
      }
    }
  };
} 