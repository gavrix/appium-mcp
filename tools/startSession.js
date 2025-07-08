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
 * @property {string | null} currentPlatform - 'ios' | 'android' | null
 * @property {object | null} currentDevice - Device info object
 */

/**
 * @typedef {object} ToolDependencies
 * @property {function(string, ...any): void} logToFile
 * @property {function(string): Promise<{stdout: string, stderr: string}>} execAsync
 * @property {function(string|null|undefined): (string|null)} parseIOSVersion
 * @property {function(string|null|undefined): (string|null)} parseAndroidVersion
 * @property {function(): Promise<Array>} detectAndroidDevices
 * @property {import('fs/promises')} fsPromises
 * @property {string} deviceLogFilePath
 * @property {string} androidLogFilePath
 * @property {import('path')} path
 * @property {import('child_process').spawn} spawn
 * @property {import('zod').z} zod // Zod instance if schemas are defined here
 * @property {function(object): Promise<WebdriverIoClient>} remote // webdriverio remote function
 * @property {import('fs')} fs // fs module for createWriteStream
 */

/**
 * Creates the definition for the "start_session" tool.
 * Starts an Appium session with an automatically detected device (iOS simulator or Android emulator/device).
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
    parseAndroidVersion,
    detectAndroidDevices,
    fsPromises,
    deviceLogFilePath,
    androidLogFilePath,
    path,
    spawn,
    remote,
    fs,
    zod: z
  } = dependencies;

  return {
    name: "start_session",
    description: "Starts an Appium session with an automatically detected device (iOS simulator or Android emulator/device).",
    schema: {
      platform: z.enum(['ios', 'android', 'auto']).optional()
        .describe("Platform preference: 'ios', 'android', or 'auto' for automatic detection (default: 'auto')"),
      deviceName: z.string().optional()
        .describe("Optional: specific device name to target")
    },
    handler: async ({ platform = 'auto', deviceName }) => {
      if (sharedState.appiumDriver) {
        return { content: [{ type: "text", text: "Session already active. Please end the current session first." }] };
      }

      let detectedDeviceInfo = null;
      let finalCapabilities = {};
      let selectedDevice = null;
      let selectedPlatform = null;

      // Device detection for both platforms
      let iosDevices = [];
      let androidDevices = [];

      // Detect iOS devices if needed
      if (platform === 'auto' || platform === 'ios') {
        try {
          logToFile('[start_session] Detecting iOS simulators...');
          const { stdout, stderr } = await execAsync('xcrun simctl list devices booted -j');
          if (stderr) {
            logToFile(`[start_session] stderr from xcrun: ${stderr}`);
          }
          const simList = JSON.parse(stdout);
          
          if (simList.devices) {
            for (const runtimeKey in simList.devices) {
              const devices = simList.devices[runtimeKey];
              const bootedDevices = devices.filter(device => device.state === 'Booted');
              for (const device of bootedDevices) {
                const iosVersion = parseIOSVersion(runtimeKey);
                iosDevices.push({
                  platform: 'ios',
                  id: device.udid,
                  name: device.name,
                  version: iosVersion || 'Unknown',
                  runtime: runtimeKey,
                  type: 'simulator'
                });
              }
            }
          }
          logToFile(`[start_session] Found ${iosDevices.length} iOS simulators`);
        } catch (error) {
          logToFile(`[start_session] iOS detection failed: ${error.message}`);
        }
      }

      // Detect Android devices if needed
      if (platform === 'auto' || platform === 'android') {
        try {
          logToFile('[start_session] Detecting Android devices...');
          androidDevices = await detectAndroidDevices();
          logToFile(`[start_session] Found ${androidDevices.length} Android devices`);
          // Add platform field to Android devices
          androidDevices = androidDevices.map(device => ({ ...device, platform: 'android' }));
        } catch (error) {
          logToFile(`[start_session] Android detection failed: ${error.message}`);
        }
      }

      // Choose the best device
      const allDevices = [...iosDevices, ...androidDevices];
      
      if (allDevices.length === 0) {
        const platformMsg = platform === 'auto' ? 'iOS or Android' : platform;
        return { content: [{ type: "text", text: `Error: No active ${platformMsg} devices found. Please ensure a device/simulator is running.` }] };
      }

      // Device selection logic
      if (deviceName) {
        // Filter devices by platform if specified
        let targetDevices = allDevices;
        if (platform !== 'auto') {
          targetDevices = allDevices.filter(device => device.platform === platform);
        }
        
        selectedDevice = targetDevices.find(device => device.name.includes(deviceName));
        if (!selectedDevice) {
          const availableNames = targetDevices.map(d => d.name).join(', ');
          return { content: [{ type: "text", text: `Error: Device with name containing '${deviceName}' not found. Available ${platform === 'auto' ? '' : platform + ' '}devices: ${availableNames}` }] };
        }
      } else {
        // Platform-specific auto-selection
        if (platform === 'ios') {
          selectedDevice = iosDevices[0];
          if (!selectedDevice) {
            return { content: [{ type: "text", text: "Error: No iOS simulators found. Please ensure an iOS simulator is running." }] };
          }
        } else if (platform === 'android') {
          selectedDevice = androidDevices[0];
          if (!selectedDevice) {
            return { content: [{ type: "text", text: "Error: No Android devices found. Please ensure an Android emulator or device is connected." }] };
          }
        } else {
          // Auto-select: prefer iOS if available, then Android
          selectedDevice = iosDevices[0] || androidDevices[0];
        }
      }

      selectedPlatform = selectedDevice.platform;
      logToFile(`[start_session] Selected ${selectedPlatform} device: ${selectedDevice.name} (${selectedDevice.id})`);

      // Generate platform-specific capabilities
      if (selectedPlatform === 'ios') {
        finalCapabilities = {
          platformName: "iOS",
          "appium:automationName": "XCUITest",
          "appium:udid": selectedDevice.id,
          "appium:deviceName": selectedDevice.name,
          "appium:newCommandTimeout": 600
        };
        if (selectedDevice.version) {
          finalCapabilities["appium:platformVersion"] = selectedDevice.version;
        }
        detectedDeviceInfo = `Found booted iOS simulator: ${selectedDevice.name} (UDID: ${selectedDevice.id}, Version: ${selectedDevice.version})`;
      } else if (selectedPlatform === 'android') {
        finalCapabilities = {
          platformName: "Android",
          "appium:automationName": "UiAutomator2",
          "appium:udid": selectedDevice.id,
          "appium:deviceName": selectedDevice.name,
          "appium:newCommandTimeout": 600
        };
        if (selectedDevice.version) {
          finalCapabilities["appium:platformVersion"] = selectedDevice.version;
        }
        detectedDeviceInfo = `Found Android device: ${selectedDevice.name} (ID: ${selectedDevice.id}, API: ${selectedDevice.apiLevel}, Version: ${selectedDevice.version})`;
      }

      logToFile('[start_session] Final capabilities prepared:', finalCapabilities);

      const connectionOptions = {
        hostname: '0.0.0.0', 
        port: 4723,          
        path: '/',            
        logLevel: 'info', 
        capabilities: finalCapabilities,
      };

      try {
        logToFile('[start_session] Attempting to connect to Appium server...');
        sharedState.appiumDriver = await remote(connectionOptions);
        sharedState.currentPlatform = selectedPlatform;
        sharedState.currentDevice = selectedDevice;
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

        // Platform-specific log capture
        const logFilePath = selectedPlatform === 'ios' ? deviceLogFilePath : androidLogFilePath;
        
        try {
          await fsPromises.truncate(logFilePath, 0);
          logToFile('[start_session] Cleared existing device log file:', logFilePath);
        } catch (err) {
          if (err.code !== 'ENOENT') {
            logToFile('[start_session] Warning: Could not clear device log file:', logFilePath, err.message);
          }
        }

        if (selectedPlatform === 'ios') {
          logToFile('[start_session] Starting iOS device log capture...');
          if (selectedDevice.id) {
            sharedState.deviceLogProcess = spawn('xcrun', [
              'simctl',
              'spawn',
              selectedDevice.id,
              'log',
              'stream',
              '--level', 'debug', 
              '--predicate', 'subsystem == "com.facebook.react.log"'
            ], {
              detached: false, 
            });

            const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });
            sharedState.deviceLogProcess.stdout.pipe(logStream);
            sharedState.deviceLogProcess.stderr.pipe(logStream);

            sharedState.deviceLogProcess.on('spawn', () => {
              logToFile('[start_session] iOS log capture process spawned successfully (PID:', sharedState.deviceLogProcess?.pid, ')');
            });

            sharedState.deviceLogProcess.on('error', (err) => {
              logToFile('[start_session] Error with iOS log capture process:', err.message);
              sharedState.deviceLogProcess = null; 
            });

            sharedState.deviceLogProcess.on('exit', (code, signal) => {
              logToFile(`[start_session] iOS log capture process exited with code ${code} and signal ${signal}`);
              sharedState.deviceLogProcess = null; 
            });
          }
        } else if (selectedPlatform === 'android') {
          logToFile('[start_session] Starting Android logcat capture...');
          sharedState.deviceLogProcess = spawn('adb', [
            '-s', selectedDevice.id,
            'logcat',
            '-v', 'time',
            '*:V'
          ], {
            detached: false,
          });

          const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });
          sharedState.deviceLogProcess.stdout.pipe(logStream);
          sharedState.deviceLogProcess.stderr.pipe(logStream);

          sharedState.deviceLogProcess.on('spawn', () => {
            logToFile('[start_session] Android logcat capture process spawned successfully (PID:', sharedState.deviceLogProcess?.pid, ')');
          });

          sharedState.deviceLogProcess.on('error', (err) => {
            logToFile('[start_session] Error with Android logcat capture process:', err.message);
            sharedState.deviceLogProcess = null; 
          });

          sharedState.deviceLogProcess.on('exit', (code, signal) => {
            logToFile(`[start_session] Android logcat capture process exited with code ${code} and signal ${signal}`);
            sharedState.deviceLogProcess = null; 
          });
        }
        // --- Device Log Capture End ---

        return { content: [{ type: "text", text: `Appium session started successfully. ${detectedDeviceInfo}` }] };
      } catch (error) {
        logToFile(`[start_session] Error starting Appium session: ${error.message}`, error.stack);
        sharedState.appiumDriver = null;
        sharedState.currentPlatform = null;
        sharedState.currentDevice = null;
        return { content: [{ type: "text", text: `Error starting Appium session: ${error.message}` }] };
      }
    }
  };
} 