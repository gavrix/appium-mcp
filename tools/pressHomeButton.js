/**
 * @typedef {import('webdriverio').RemoteClient} WebdriverIoClient
 * @typedef {object} SharedState
 * @property {WebdriverIoClient | null} appiumDriver
 * @property {string | null} currentPlatform - 'ios' | 'android' | null
 */

/**
 * @typedef {object} ToolDependencies
 * @property {function(string, ...any): void} logToFile
 * @property {import('zod').z} zod
 */

/**
 * Creates a tool to simulate pressing the home button on the device.
 * @param {SharedState} sharedState - The shared state object.
 * @param {ToolDependencies} dependencies - The tool dependencies.
 * @returns {{name: string, description: string, schema: object, handler: function(): Promise<object>}}
 */
export function createPressHomeButtonTool(sharedState, dependencies) {
  const { logToFile, zod: z } = dependencies;
  const schema = z.object({});
  const outputSchema = z.string().describe("A message confirming the home button press was successful.");

  async function handler() {
    logToFile('[pressHomeButton] Simulating home button press.');
    if (!sharedState.appiumDriver) {
      logToFile('[pressHomeButton] Error: Appium session not started.');
      return { content: [{ type: "text", text: 'Error: Appium session not started. Please start a session first.' }] };
    }

    const platformName = sharedState.appiumDriver.capabilities.platformName?.toLowerCase();
    logToFile(`[pressHomeButton] Detected platform: ${platformName}`);

    try {
      if (platformName === 'ios') {
        // 'mobile: pressButton' is the command for XCUITest (iOS).
        await sharedState.appiumDriver.execute('mobile: pressButton', { name: 'home' });
      } else if (platformName === 'android') {
        // `pressKeyCode` is the command for UiAutomator2 (Android). Keycode 3 is for HOME.
        await sharedState.appiumDriver.pressKeyCode(3);
      } else {
        throw new Error(`Unsupported platform: ${platformName}. This tool only supports iOS and Android.`);
      }
      
      const successMessage = 'Successfully simulated home button press. The application is now in the background.';
      logToFile(`[pressHomeButton] ${successMessage}`);
      return { content: [{ type: "text", text: successMessage }] };
    } catch (error) {
      logToFile('[pressHomeButton] Error simulating home button press:', error.message, error.stack);
      return { content: [{ type: "text", text: `Failed to simulate home button press: ${error.message}` }] };
    }
  }

  return {
    name: 'press_home_button',
    description: 'Simulates pressing the home button to send the current application to the background without closing the session.',
    schema,
    handler
  };
} 