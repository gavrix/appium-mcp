import { z } from 'zod';

/**
 * @typedef {import('../server.js').SharedState} SharedState
 * @typedef {import('../server.js').ToolDependencies} ToolDependencies
 */

/**
 * Creates a tool to simulate pressing the home button on the device.
 * @param {SharedState} sharedState - The shared state object.
 * @param {ToolDependencies} dependencies - The tool dependencies.
 * @returns {import('@modelcontextprotocol/sdk').ToolDefinition<z.ZodObject<{}>>}
 */
export function createPressHomeButtonTool(sharedState, { logToFile, zod: z }) {
  const schema = z.object({});
  const outputSchema = z.string().describe("A message confirming the home button press was successful.");

  async function handler() {
    logToFile('[pressHomeButton] Simulating home button press.');
    if (!sharedState.appiumDriver) {
      logToFile('[pressHomeButton] Error: Appium session not started.');
      throw new Error('Appium session not started. Please start a session first.');
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
      return successMessage;
    } catch (error) {
      logToFile('[pressHomeButton] Error simulating home button press:', error);
      throw new Error(`Failed to simulate home button press: ${error.message}`);
    }
  }

  return {
    name: 'press_home_button',
    description: 'Simulates pressing the home button to send the current application to the background without closing the session.',
    schema,
    outputSchema,
    handler,
  };
} 