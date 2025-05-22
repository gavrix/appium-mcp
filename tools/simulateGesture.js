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
 * Simulates a custom gesture on the device using WebdriverIO's performActions method (W3C Actions API).
 *
 * @param {SharedState} sharedState - An object to manage shared state like appiumDriver.
 * @param {ToolDependencies} dependencies - An object containing dependencies like logToFile and zod.
 * @returns {{name: string, description: string, schema: object, handler: function({gestureDescription: string}): Promise<object>}} The tool definition object.
 */
export function createSimulateGestureTool(sharedState, dependencies) {
  const { logToFile, zod: z } = dependencies;

  return {
    name: "simulate_gesture",
    description: "Simulates a custom gesture on the device using WebdriverIO's performActions method (W3C Actions API). The gestureDescription argument must be a JSON string representing an array of action sequences. Each sequence defines an input source (e.g., a finger touch) and its series of actions. Example structure: '[{\"type\":\"pointer\", \"id\":\"finger1\", \"parameters\":{\"pointerType\":\"touch\"}, \"actions\":[{\"type\":\"pointerMove\",\"duration\":0,\"x\":100,\"y\":100}, {\"type\":\"pointerDown\",\"button\":0}, {\"type\":\"pause\",\"duration\":200}, {\"type\":\"pointerMove\",\"duration\":500,\"origin\":\"pointer\",\"x\":100,\"y\":300}, {\"type\":\"pointerUp\",\"button\":0}]}]'. Refer to W3C WebDriver Actions API and Appium/WebdriverIO documentation for 'performActions' for detailed structure and available action types.",
    schema: { 
      gestureDescription: z.string().describe("A JSON string for W3C actions: an array of action sequences. Each sequence has 'type', 'id', 'parameters', and an 'actions' array (e.g., pointerMove, pointerDown, pause, pointerUp). Example: '[{\"type\":\"pointer\",\"id\":\"f1\",\"parameters\":{\"pointerType\":\"touch\"},\"actions\":[{\"type\":\"pointerMove\",\"x\":10,\"y\":10},{\"type\":\"pointerDown\"},{\"type\":\"pointerUp\"}]}]'")
    },
    handler: async ({ gestureDescription }) => {
      if (!sharedState.appiumDriver) {
        return { content: [{ type: "text", text: "Error: Appium session not active. Please start a session first." }] };
      }
      if (!gestureDescription) {
        return { content: [{ type: "text", text: "Error: gestureDescription was not provided."}] };
      }

      let parsedActionSequences;
      try {
        parsedActionSequences = JSON.parse(gestureDescription);
        if (!Array.isArray(parsedActionSequences)) {
          throw new Error("gestureDescription must be a JSON array of action sequences.");
        }
        if (parsedActionSequences.length > 0) {
          const firstSequence = parsedActionSequences[0];
          if (typeof firstSequence.type === 'undefined' || typeof firstSequence.id === 'undefined' || typeof firstSequence.actions === 'undefined') {
            logToFile('[simulate_gesture] Warning: Parsed gestureDescription might not follow the expected W3C performActions structure (missing type, id, or actions array in the first sequence).', JSON.stringify(parsedActionSequences, null, 2));
          }
        }
      } catch (parseError) {
        logToFile('[simulate_gesture] Error parsing gestureDescription JSON for performActions:', parseError.message);
        return { content: [{ type: "text", text: `Error parsing gestureDescription JSON: ${parseError.message}. Expected an array of W3C action sequences.` }] };
      }

      try {
        logToFile(`[simulate_gesture] Attempting to perform W3C actions with: ${JSON.stringify(parsedActionSequences)}`);
        
        // @ts-ignore performActions is a valid command
        await sharedState.appiumDriver.performActions(parsedActionSequences);
        
        logToFile(`[simulate_gesture] W3C actions performed successfully.`);
        return { content: [{ type: "text", text: "Gesture (W3C actions) performed successfully." }] };
      } catch (error) {
        logToFile(`[simulate_gesture] Error performing W3C actions: ${error.message}`, error.stack);
        return { content: [{ type: "text", text: `Error performing W3C actions: ${error.message}` }] };
      }
    }
  };
} 