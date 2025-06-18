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
 * Creates the definition for the "simulate_gesture" tool.
 * Simulates a custom gesture using normalized [0, 1] coordinates. The gestureDescription argument is a JSON string of W3C action sequences. All 'x' and 'y' coordinates for 'pointerMove' actions MUST be provided as normalized values between 0.0 and 1.0. The tool automatically converts these to absolute pixel coordinates based on the device's screen size. For relative moves (origin: 'pointer'), the delta is also normalized. Example of a right-to-left swipe across 80% of the screen width: '[{\"type\":\"pointer\", \"id\":\"finger1\", \"parameters\":{\"pointerType\":\"touch\"}, \"actions\":[{\"type\":\"pointerMove\",\"duration\":0,\"x\":0.9,\"y\":0.5}, {\"type\":\"pointerDown\",\"button\":0}, {\"type\":\"pause\",\"duration\":200}, {\"type\":\"pointerMove\",\"duration\":500,\"origin\":\"pointer\",\"x\":-0.8,\"y\":0}, {\"type\":\"pointerUp\",\"button\":0}]}]'.",
 *
 * @param {SharedState} sharedState - An object to manage shared state like appiumDriver.
 * @param {ToolDependencies} dependencies - An object containing dependencies like logToFile and zod.
 * @returns {{name: string, description: string, schema: object, handler: function({gestureDescription: string}): Promise<object>}} The tool definition object.
 */
export function createSimulateGestureTool(sharedState, dependencies) {
  const { logToFile, zod: z } = dependencies;

  return {
    name: "simulate_gesture",
    description: "Simulates a custom gesture using normalized [0, 1] coordinates. The gestureDescription argument is a JSON string of W3C action sequences. All 'x' and 'y' coordinates for 'pointerMove' actions MUST be provided as normalized values between 0.0 and 1.0. The tool automatically converts these to absolute pixel coordinates based on the device's screen size. For relative moves (origin: 'pointer'), the delta is also normalized. Example of a right-to-left swipe across 80% of the screen width: '[{\"type\":\"pointer\", \"id\":\"finger1\", \"parameters\":{\"pointerType\":\"touch\"}, \"actions\":[{\"type\":\"pointerMove\",\"duration\":0,\"x\":0.9,\"y\":0.5}, {\"type\":\"pointerDown\",\"button\":0}, {\"type\":\"pause\",\"duration\":200}, {\"type\":\"pointerMove\",\"duration\":500,\"origin\":\"pointer\",\"x\":-0.8,\"y\":0}, {\"type\":\"pointerUp\",\"button\":0}]}]'.",
    schema: { 
      gestureDescription: z.string().describe("A JSON string for W3C actions using normalized [0, 1] coordinates for all 'pointerMove' actions. Example: '[{\"type\":\"pointer\",\"id\":\"f1\",\"actions\":[{\"type\":\"pointerMove\",\"x\":0.9,\"y\":0.5},{\"type\":\"pointerDown\"},{\"type\":\"pointerMove\",\"origin\":\"pointer\",\"x\":-0.8,\"y\":0},{\"type\":\"pointerUp\"}]}]'")
    },
    handler: async ({ gestureDescription }) => {
      if (!sharedState.appiumDriver) {
        return { content: [{ type: "text", text: "Error: Appium session not active. Please start a session first." }] };
      }
      if (!gestureDescription) {
        return { content: [{ type: "text", text: "Error: gestureDescription was not provided."}] };
      }

      logToFile(`[simulate_gesture] Received raw gestureDescription: ${gestureDescription}`);

      let parsedActionSequences;
      try {
        parsedActionSequences = JSON.parse(gestureDescription);
        if (!Array.isArray(parsedActionSequences)) {
          throw new Error("gestureDescription must be a JSON array of action sequences.");
        }
      } catch (parseError) {
        logToFile('[simulate_gesture] Error parsing gestureDescription JSON for performActions:', parseError.message);
        return { content: [{ type: "text", text: `Error parsing gestureDescription JSON: ${parseError.message}. Expected an array of W3C action sequences.` }] };
      }

      try {
        const { width, height } = await sharedState.appiumDriver.getWindowSize();
        logToFile(`[simulate_gesture] Normalizing coordinates based on screen size: ${width}x${height}`);

        // Deep clone the structure to avoid modifying the original input object.
        const recalculatedSequences = JSON.parse(JSON.stringify(parsedActionSequences));

        recalculatedSequences.forEach(sequence => {
          if (sequence.type === 'pointer' && Array.isArray(sequence.actions)) {
            sequence.actions.forEach(action => {
              if (action.type === 'pointerMove') {
                if (typeof action.x === 'number') {
                  logToFile(`[simulate_gesture] Normalizing x: ${action.x} to ${Math.round(action.x * width)}`);
                  action.x = Math.round(action.x * width);
                }
                if (typeof action.y === 'number') {
                  logToFile(`[simulate_gesture] Normalizing y: ${action.y} to ${Math.round(action.y * height)}`);
                  action.y = Math.round(action.y * height);
                }
              }
            });
          }
        });
        
        logToFile(`[simulate_gesture] Attempting to perform W3C actions with recalculated coordinates: ${JSON.stringify(recalculatedSequences)}`);
        
        // @ts-ignore performActions is a valid command
        await sharedState.appiumDriver.performActions(recalculatedSequences);
        
        logToFile(`[simulate_gesture] W3C actions performed successfully.`);
        return { content: [{ type: "text", text: "Gesture (W3C actions) performed successfully." }] };
      } catch (error) {
        logToFile(`[simulate_gesture] Error performing W3C actions: ${error.message}`, error.stack);
        return { content: [{ type: "text", text: `Error performing W3C actions: ${error.message}` }] };
      }
    }
  };
} 