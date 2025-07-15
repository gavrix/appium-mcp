#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod"; // We'll likely use Zod for schema validation later
import { remote } from 'webdriverio';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import fs from 'fs'; // Added for file logging
import fsPromises from 'fs/promises'; // Added for async file operations
import path from 'path'; // Added for path joining
import { fileURLToPath } from 'url'; // Added for ESM __dirname equivalent

// Import tool factory functions
import { createStartSessionTool } from './tools/startSession.js';
import { createLaunchAppTool } from './tools/launchApp.js';
import { createGetPageSourceTool } from './tools/getPageSource.js';
import { createFindElementTool } from './tools/findElement.js';
import { createTapElementTool } from './tools/tapElement.js';
import { createGetScreenshotTool } from './tools/getScreenshot.js';
import { createGetScreenshotFileTool } from './tools/getScreenshotFile.js';
import { createGetPageSourceFileTool } from './tools/getPageSourceFile.js';
import { createGetDeviceLogsTool } from './tools/getDeviceLogs.js';
import { createSimulateGestureTool } from './tools/simulateGesture.js';
import { createEndSessionTool } from './tools/endSession.js';
import { createEnterTextTool } from './tools/enterTextTool.js';
import { createGetElementTextTool } from './tools/getElementText.js';
import { createPressHomeButtonTool } from './tools/pressHomeButton.js';

// --- Log file setup ---
const __filename_esm = fileURLToPath(import.meta.url); // ESM equivalent of __filename
const __dirname_esm = path.dirname(__filename_esm);   // ESM equivalent of __dirname
const logFilePath = path.join(__dirname_esm, 'mcp-server.log'); // Log file next to the script

function logToFile(message, ...optionalParams) {
  const timestamp = new Date().toISOString();
  // Ensure optionalParams are stringified if they are objects
  const paramsString = optionalParams.map(p => typeof p === 'object' ? JSON.stringify(p, null, 2) : p).join(' ');
  const logMessage = `${timestamp} - ${message} ${paramsString}\n`;
  try {
    fs.appendFileSync(logFilePath, logMessage);
  } catch (err) {
    // Minimal fallback, try to avoid console if possible
    // fs.appendFileSync(path.join(process.cwd(), 'mcp-server-fallback-error.log'), `Failed to write to main log: ${err}\nOriginal: ${logMessage}\n`);
  }
}
// --- End log file setup ---

const execAsync = promisify(exec);
let appiumDriver = null; // To store the Appium driver session

// Global variables for device log capturing, managed via sharedState
let deviceLogProcess = null;
const deviceLogFilePath = path.join(__dirname_esm, 'device_console.log');
const androidLogFilePath = path.join(__dirname_esm, 'android_logcat.log');

// Helper to parse iOS version from runtime string (e.g., com.apple.CoreSimulator.SimRuntime.iOS-17-2)
function parseIOSVersion(runtimeString) {
  if (!runtimeString) return null;
  const match = runtimeString.match(/iOS-(\d+)-(\d+)/) || runtimeString.match(/iOS (\d+)\.(\d+)/) ;
  if (match && match[1] && match[2]) {
    return `${match[1]}.${match[2]}`;
  }
  const singleVersionMatch = runtimeString.match(/iOS-(\d+)/);
  if (singleVersionMatch && singleVersionMatch[1]) {
    return singleVersionMatch[1];
  }
  return null;
}

// Helper to parse Android API level to version name
function parseAndroidVersion(apiLevel) {
  if (!apiLevel) return null;
  const apiLevelNum = parseInt(apiLevel, 10);
  // Common Android API level mappings
  const versionMap = {
    34: '14.0', 33: '13.0', 32: '12.1', 31: '12.0', 30: '11.0',
    29: '10.0', 28: '9.0', 27: '8.1', 26: '8.0', 25: '7.1',
    24: '7.0', 23: '6.0', 22: '5.1', 21: '5.0'
  };
  return versionMap[apiLevelNum] || apiLevel;
}

// Helper to detect Android devices/emulators
async function detectAndroidDevices() {
  try {
    const { stdout } = await execAsync('adb devices -l');
    const lines = stdout.split('\n').filter(line => line.trim() && !line.includes('List of devices'));
    
    const devices = [];
    for (const line of lines) {
      const parts = line.split(/\s+/);
      if (parts.length >= 2 && parts[1] === 'device') {
        const deviceId = parts[0];
        
        try {
          // Get device properties
          const { stdout: propOutput } = await execAsync(`adb -s ${deviceId} shell getprop ro.product.model`);
          const { stdout: apiOutput } = await execAsync(`adb -s ${deviceId} shell getprop ro.build.version.sdk`);
          
          const deviceName = propOutput.trim() || 'Unknown Android Device';
          const apiLevel = apiOutput.trim();
          const androidVersion = parseAndroidVersion(apiLevel);
          
          devices.push({
            id: deviceId,
            name: deviceName,
            apiLevel: apiLevel,
            version: androidVersion,
            type: deviceId.includes('emulator') ? 'emulator' : 'device'
          });
        } catch (propError) {
          // If we can't get properties, still include the device
          devices.push({
            id: deviceId,
            name: 'Unknown Android Device',
            apiLevel: 'unknown',
            version: 'unknown',
            type: deviceId.includes('emulator') ? 'emulator' : 'device'
          });
        }
      }
    }
    return devices;
  } catch (error) {
    return []; // Return empty array if ADB not available
  }
}

async function main() {
  const server = new McpServer({
    name: "appium-mcp-server",
    version: "0.1.0",
  });

  /**
   * @type {import('./tools/startSession.js').SharedState} // Using one of the typedefs for structure
   */
  const sharedState = {
    appiumDriver: null,
    deviceLogProcess: null,
    currentPlatform: null,  // 'ios' | 'android' | null
    currentDevice: null,    // Device info object
  };

  /**
   * @type {import('./tools/startSession.js').ToolDependencies} // Using one of the typedefs for structure
   */
  const toolDependencies = {
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
    zod: z, // Pass the imported z instance
    remote, // Pass the imported remote function from webdriverio
    fs,     // Pass the fs module (specifically for createWriteStream in startSession)
  };

  // Create tool definitions by calling their factory functions
  const toolDefinitions = [
    createStartSessionTool(sharedState, toolDependencies),
    createLaunchAppTool(sharedState, toolDependencies),
    createGetPageSourceTool(sharedState, toolDependencies),
    createFindElementTool(sharedState, toolDependencies),
    createTapElementTool(sharedState, toolDependencies),
    createEnterTextTool(sharedState, toolDependencies),
    createGetElementTextTool(sharedState, toolDependencies),
    createGetScreenshotTool(sharedState, toolDependencies),
    createGetScreenshotFileTool(sharedState, toolDependencies),
    createGetPageSourceFileTool(sharedState, toolDependencies),
    createGetDeviceLogsTool(sharedState, toolDependencies),
    createSimulateGestureTool(sharedState, toolDependencies),
    createEndSessionTool(sharedState, toolDependencies),
    createPressHomeButtonTool(sharedState, toolDependencies),
  ];

  // Register tools with the server
  for (const toolDef of toolDefinitions) {
    server.tool(toolDef.name, toolDef.description, toolDef.schema, toolDef.handler);
  }

  // Setup the transport (stdio for now)
  const transport = new StdioServerTransport();

  // Connect the server to the transport
  try {
    await server.connect(transport);
    logToFile("Appium MCP Server connected via stdio and ready.");
  } catch (error) {
    logToFile("Failed to connect Appium MCP Server during startup:", error);
    process.exit(1);
  }

  // Keep the server running
  process.on("SIGINT", async () => {
    logToFile("Received SIGINT. Shutting down server...");
    if (sharedState.appiumDriver) {
      await sharedState.appiumDriver.deleteSession().catch(err => { 
        logToFile("Error during SIGINT session cleanup:", err);
      }); 
    }
    if (sharedState.deviceLogProcess) {
      logToFile('[SIGINT] Terminating device log capture process.');
      try {
        sharedState.deviceLogProcess.kill('SIGTERM');
      } catch (killError) {
        logToFile('[SIGINT] Error terminating device log process:', killError.message);
      }
      sharedState.deviceLogProcess = null;
    }
    await server.close();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    logToFile("Received SIGTERM. Shutting down server...");
    if (sharedState.appiumDriver) {
      await sharedState.appiumDriver.deleteSession().catch(err => { 
        logToFile("Error during SIGTERM session cleanup:", err);
      }); 
    }
    if (sharedState.deviceLogProcess) {
      logToFile('[SIGTERM] Terminating device log capture process.');
      try {
        sharedState.deviceLogProcess.kill('SIGTERM');
      } catch (killError) {
        logToFile('[SIGTERM] Error terminating device log process:', killError.message);
      }
      sharedState.deviceLogProcess = null;
    }
    await server.close();
    process.exit(0);
  });
}

main().catch((error) => {
  logToFile("Unhandled error in main:", error.message, error.stack);
  process.exit(1);
}); 