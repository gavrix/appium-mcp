// import { z } from 'zod'; // No longer imported here if Zod schemas are defined in server.js or if z is passed as a dep

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
 * @property {function(string): Promise<{stdout: string, stderr: string}>} execAsync
 * @property {function(string|null|undefined): (string|null)} parseIOSVersion
 * @property {import('fs/promises')} fsPromises
 * @property {string} deviceLogFilePath
 * @property {import('path')} path
 * @property {import('child_process').spawn} spawn
 * @property {import('zod').z} zod // Zod instance if schemas are defined here
 * @property {function(object): Promise<WebdriverIoClient>} remote // webdriverio remote function
 * @property {import('fs')} fs // fs module for createWriteStream
 */

/**
 * Creates the definition for the "start_session" tool.
 * Starts an Appium session with an automatically detected booted iOS simulator.
 *
 * @param {SharedState} sharedState - An object to manage shared state like appiumDriver and deviceLogProcess.
 * @param {ToolDependencies} dependencies - An object containing dependencies like logToFile, execAsync, etc.
 * @returns {{name: string, description: string, schema: object, handler: function(): Promise<object>}} The tool definition object.
 */
export function createStartSessionTool(sharedState, dependencies) {
  const {
    logToFile,
    execAsync,
    parseIOSVersion,
    fsPromises,
    deviceLogFilePath,
    // path, // path might not be needed directly by handler if deviceLogFilePath is complete
    spawn,
    // zod, // Zod passed if schema is built here; otherwise schema is passed or built in server.js
    remote,
    fs
  } = dependencies;

  return {
    name: "start_session",
    description: "Starts an Appium session with an automatically detected booted iOS simulator.",
    schema: { /* No arguments needed for this simplified version */ },
    handler: async () => {
      if (sharedState.appiumDriver) {
        return { content: [{ type: "text", text: "Session already active. Please end the current session first." }] };
      }

      let detectedSimulatorInfo = null;
      let finalCapabilities = {};
      let bootedSimulator = null;
      let simulatorRuntime = null;

      try {
        logToFile('[start_session] Executing: xcrun simctl list devices booted -j');
        const { stdout, stderr } = await execAsync('xcrun simctl list devices booted -j');
        if (stderr) {
          logToFile(`[start_session] stderr from xcrun: ${stderr}`);
        }
        logToFile('[start_session] Successfully executed xcrun list. Parsing JSON output.');
        const simList = JSON.parse(stdout);
        
        if (simList.devices) {
          for (const runtimeKey in simList.devices) {
            const devices = simList.devices[runtimeKey];
            bootedSimulator = devices.find(device => device.state === 'Booted');
            if (bootedSimulator) {
              simulatorRuntime = runtimeKey;
              logToFile(`[start_session] Found booted simulator: ${bootedSimulator.name} on runtime ${runtimeKey}`);
              break;
            }
          }
        }

        if (bootedSimulator) {
          const iosVersion = parseIOSVersion(simulatorRuntime);
          detectedSimulatorInfo = `Found booted iOS simulator: ${bootedSimulator.name} (UDID: ${bootedSimulator.udid}, Version: ${iosVersion || 'Unknown'}).`;
          logToFile(`[start_session] ${detectedSimulatorInfo}`);
          
          finalCapabilities = {
            platformName: "iOS",
            "appium:automationName": "XCUITest",
            "appium:udid": bootedSimulator.udid,
            "appium:deviceName": bootedSimulator.name,
            "appium:newCommandTimeout": 600 // 10 minutes
          };
          if (iosVersion) {
            finalCapabilities["appium:platformVersion"] = iosVersion;
          }
          logToFile('[start_session] Final capabilities prepared:', finalCapabilities);

        } else {
          logToFile('[start_session] Error: No active iOS simulator found.');
          return { content: [{ type: "text", text: "Error: No active iOS simulator found. Please ensure an iOS simulator is running before starting a session." }] };
        }
      } catch (error) {
        logToFile(`[start_session] Error detecting iOS simulators: ${error.message}`, error);
        let errorMessage = `Error detecting iOS simulators: ${error.message}`;
        if (error.message.includes('xcrun: command not found')) {
             errorMessage = "Error: xcrun command not found. Automatic iOS simulator detection is only supported on macOS with Xcode command line tools installed.";
        }
        return { content: [{ type: "text", text: errorMessage }] };
      }

      const connectionOptions = {
        hostname: '0.0.0.0', 
        port: 4723,          
        path: '/',            
        logLevel: 'info', 
        capabilities: finalCapabilities,
      };
      logToFile('[start_session] Appium connection options:', connectionOptions);

      try {
        logToFile('[start_session] Attempting to connect to Appium server...');
        sharedState.appiumDriver = await remote(connectionOptions);
        logToFile('[start_session] Appium session started successfully. Driver obtained.');
        
        // --- Device Log Capture Start ---
        if (sharedState.deviceLogProcess) {
          logToFile('[start_session] Existing device log process found. Terminating it.');
          try {
            sharedState.deviceLogProcess.kill('SIGTERM');
          } catch (killError) {
            logToFile('[start_session] Error terminating existing device log process:', killError.message);
          }
          sharedState.deviceLogProcess = null;
        }

        try {
          await fsPromises.truncate(deviceLogFilePath, 0);
          logToFile('[start_session] Cleared existing device console log file:', deviceLogFilePath);
        } catch (err) {
          if (err.code !== 'ENOENT') { // Ignore if file doesn't exist
            logToFile('[start_session] Warning: Could not clear device console log file:', deviceLogFilePath, err.message);
          } else {
            logToFile('[start_session] Device console log file does not exist, no need to clear:', deviceLogFilePath);
          }
        }

        if (finalCapabilities.platformName === "iOS") { 
          logToFile('[start_session] Starting device log capture for iOS using os_log stream...');

          if (!bootedSimulator || !bootedSimulator.udid) {
            logToFile('[start_session] Error: Cannot start log capture, simulator UDID is not available.');
          } else {
            const simulatorUDID = bootedSimulator.udid;
            logToFile(`[start_session] Using UDID ${simulatorUDID} for log streaming.`);

            // Ensure 'spawn' and 'fs' are correctly passed and available
            if (!spawn || !fs || !fs.createWriteStream) {
                logToFile('[start_session] CRITICAL ERROR: spawn or fs.createWriteStream not available in dependencies.');
                // Potentially return an error or throw, as log capture will fail
            } else {
                sharedState.deviceLogProcess = spawn('xcrun', [
                  'simctl',
                  'spawn',
                  simulatorUDID,
                  'log',
                  'stream',
                  '--level', 'debug', 
                  '--predicate', 'subsystem == "com.facebook.react.log"' // Example predicate
                ], {
                  detached: false, 
                });

                const logStream = fs.createWriteStream(deviceLogFilePath, { flags: 'a' });
                sharedState.deviceLogProcess.stdout.pipe(logStream);
                sharedState.deviceLogProcess.stderr.pipe(logStream);

                sharedState.deviceLogProcess.on('spawn', () => {
                  logToFile('[start_session] Device log capture process spawned successfully (PID:', sharedState.deviceLogProcess?.pid, '). Logging to:', deviceLogFilePath);
                });

                sharedState.deviceLogProcess.on('error', (err) => {
                  logToFile('[start_session] Error with device log capture process:', err.message);
                  sharedState.deviceLogProcess = null; 
                });

                sharedState.deviceLogProcess.on('exit', (code, signal) => {
                  logToFile(`[start_session] Device log capture process exited with code ${code} and signal ${signal}`);
                  sharedState.deviceLogProcess = null; 
                });
            }
          }
        }
        // --- Device Log Capture End ---

        return { content: [{ type: "text", text: `Appium session started successfully. ${detectedSimulatorInfo}` }] };
      } catch (error) {
        logToFile(`[start_session] Error starting Appium session: ${error.message}`, error.stack);
        sharedState.appiumDriver = null;
        return { content: [{ type: "text", text: `Error starting Appium session: ${error.message}` }] };
      }
    }
  };
} 