# Appium MCP Server - AI Agent Context

This document provides comprehensive context for AI agents (Claude, Cursor, etc.) working with the Appium MCP (Model Context Protocol) server project.

## Project Overview

This is an Appium MCP server that exposes mobile automation capabilities as standardized tools for MCP clients. It acts as a bridge between MCP clients (like LLMs or automation scripts) and mobile applications through Appium.

### Key Features
- **Platform Support**: Both iOS simulators and Android emulators/devices
- **Protocol**: Model Context Protocol (MCP)
- **Main Purpose**: Enable AI/automation tools to interact with mobile apps
- **Installation**: Designed to run via `npx @gavrix/appium-mcp`

## Project Structure

```
appium-mcp/
├── server.js              # Main entry point - initializes MCP server and loads tools
├── tools/                 # Individual tool implementations
│   ├── startSession.js    # Starts Appium session with iOS/Android device
│   ├── launchApp.js       # Launches app by bundle ID/package name
│   ├── getPageSource.js   # Gets XML source hierarchy
│   ├── getPageSourceFile.js # Saves page source to file
│   ├── findElement.js     # Finds UI elements
│   ├── tapElement.js      # Taps/clicks elements
│   ├── getScreenshot.js   # Captures screenshots
│   ├── getScreenshotFile.js # Saves screenshot to file
│   ├── getDeviceLogs.js   # Retrieves device console logs
│   ├── simulateGesture.js # Custom gestures
│   ├── endSession.js      # Ends Appium session
│   ├── enterTextTool.js   # Text input
│   ├── getElementText.js  # Gets element text content
│   └── pressHomeButton.js # Simulates home button press
├── mcp-server.log         # General server logs
├── device_console.log     # iOS simulator logs (React Native filtered)
├── android_logcat.log     # Android device logs
└── .cursor/rules/         # Cursor IDE specific rules
    ├── project-overview.mdc
    ├── project-structure.mdc
    └── adding-new-tools.mdc
```

## Architecture Details

### Core Components

1. **Server.js**:
   - Initializes `McpServer` with stdio transport
   - Sets up shared state (`appiumDriver`, `deviceLogProcess`, `currentPlatform`, `currentDevice`)
   - Configures tool dependencies (logging, parsing, device detection, file operations)
   - Includes platform-specific helpers (`parseIOSVersion`, `parseAndroidVersion`, `detectAndroidDevices`)
   - Dynamically loads and registers all tools

2. **Tool Pattern**:
   - Each tool is a separate module exporting a factory function
   - Factory function: `create<ToolName>Tool(sharedState, dependencies)`
   - Returns tool definition with:
     - `name`: Snake_case identifier
     - `description`: Human-readable description
     - `schema`: Zod schema for arguments
     - `handler`: Async function with tool logic

3. **Shared State**:
   - `appiumDriver`: WebdriverIO client instance
   - `deviceLogProcess`: Process capturing device logs
   - `currentPlatform`: Current platform ('ios' | 'android' | null)
   - `currentDevice`: Device info object

4. **Dependencies**:
   - `logToFile`: Centralized logging function
   - `zod`: Schema validation library
   - `fsPromises`: Async file operations
   - `parseIOSVersion`: iOS version parser
   - `parseAndroidVersion`: Android version parser
   - `detectAndroidDevices`: Android device detection
   - `deviceLogFilePath`: iOS log file path
   - `androidLogFilePath`: Android log file path

## Available Tools

1. **start_session**: Initializes Appium with device detection
   - Parameters: 
     - `platform` (optional): 'ios', 'android', or 'auto' (default)
     - `deviceName` (optional): specific device name to target
   - Auto-detects available devices when platform='auto'
2. **launch_app**: Opens app using bundle ID (iOS) or package name (Android)
3. **get_page_source**: Returns XML hierarchy of current screen
4. **get_page_source_file**: Saves page source XML to specified file path
5. **find_element**: Locates UI elements using various strategies
6. **tap_element**: Performs tap/click on element by ID
7. **get_screenshot**: Captures and returns base64 screenshot
8. **get_screenshot_file**: Saves screenshot to specified file path
9. **get_device_logs**: Retrieves recent device console logs
10. **simulate_gesture**: Performs custom touch gestures
11. **end_session**: Cleanly terminates Appium session
12. **enter_text**: Inputs text into focused element
13. **get_element_text**: Extracts text content from element
14. **press_home_button**: Simulates home button press (iOS and Android)

## Adding New Tools

To add a new tool:

1. Create `tools/create<YourToolName>Tool.js`
2. Define JSDoc typedefs for SharedState and ToolDependencies
3. Export factory function following the pattern:
   ```javascript
   export function create<YourToolName>Tool(sharedState, dependencies) {
     const { logToFile, zod: z } = dependencies;
     return {
       name: "your_tool_name",
       description: "What this tool does",
       schema: { /* Zod schema */ },
       handler: async (args) => { /* Implementation */ }
     };
   }
   ```
4. Import and register in `server.js`

## Development Guidelines

### Code Conventions
- Use JSDoc type annotations throughout
- Follow existing naming patterns (camelCase for functions, snake_case for tool names)
- All tools must check `sharedState.appiumDriver` before Appium operations
- Return MCP-compliant responses: `{ content: [{ type: "text", text: "result" }] }`
- Handle errors gracefully with informative messages

### Logging
- Use `logToFile()` for all logging needs
- Log format: `[tool_name] message`
- Include stack traces for errors
- Logs are written to `mcp-server.log`

### Testing
- Test tools with actual iOS simulator
- Verify MCP protocol compliance
- Check error handling for edge cases

## Common Patterns

### Tool Handler Template
```javascript
handler: async ({ arg1, arg2 }) => {
  if (!sharedState.appiumDriver) {
    return { content: [{ type: "text", text: "Error: Appium session not active." }] };
  }
  try {
    logToFile(`[tool_name] Executing with args: ${arg1}, ${arg2}`);
    // Tool implementation
    return { content: [{ type: "text", text: "Success message" }] };
  } catch (error) {
    logToFile(`[tool_name] Error: ${error.message}`, error.stack);
    return { content: [{ type: "text", text: `Error: ${error.message}` }] };
  }
}
```

### Appium Operations
- Always wrap in try-catch blocks
- Check session state before operations
- Use appropriate WebdriverIO methods
- Handle element not found gracefully

## Dependencies

- `@modelcontextprotocol/sdk`: MCP server implementation
- `webdriverio`: Appium client library
- `zod`: Runtime type validation
- Node.js built-ins: `fs`, `child_process`, `path`, `util`

## Configuration

### MCP Client Setup
```json
{
  "command": "npx",
  "args": ["@gavrix/appium-mcp"],
  "env": {}
}
```

### Environment Requirements

**For iOS Support:**
- macOS with Xcode and command line tools installed
- iOS Simulator running
- Appium server running on port 4723

**For Android Support:**
- Android SDK with ADB installed and in PATH
- Android emulator running or physical device connected
- Appium server running on port 4723

## Platform-Specific Features

### iOS Support
- Automatic detection of booted iOS simulators
- iOS-specific log capture using `log stream` (previously `xcrun simctl spawn`)
- Support for iOS-specific element finding strategies (`-ios class chain`, `-ios predicate string`)
- React Native log filtering in device console

### Android Support
- Automatic detection of connected Android devices and emulators
- Android logcat capture with configurable filtering
- Support for Android-specific element finding strategies (`-android uiautomator`)
- API level to version mapping for better device identification

## Important Notes

1. **Session Management**: Only one Appium session at a time
2. **Cross-Platform**: Supports both iOS simulators and Android devices/emulators
3. **Auto-Detection**: Automatically detects available devices when platform='auto'
4. **Platform Selection**: Can specify platform preference in start_session
5. **Error Recovery**: Tools should fail gracefully without crashing server
6. **Async Operations**: All tool handlers must be async
7. **Logging**: Separate log files for iOS (device_console.log) and Android (android_logcat.log)

## Recent Changes

### Latest Updates (from main)
- **Android Support**: Full support for Android emulators and physical devices
- **Platform Auto-Detection**: Automatically detects and selects available devices
- **New Tool**: `get_page_source_file` - Saves page source XML to file
- **Enhanced start_session**: Now accepts platform and deviceName parameters
- **Improved Logging**: Platform-specific log capture for both iOS and Android

### Pending Changes (in PRs)
- **New Tool**: `press_home_button` - Works on both iOS and Android
- **Enhanced Gestures**: `simulate_gesture` now uses normalized coordinates (0.0-1.0)
- **Documentation**: This CLAUDE.md file for AI agent context

## Debugging Tips

1. Check `mcp-server.log` for detailed execution logs
2. Monitor `device_console.log` for app-specific issues
3. Verify Appium server is running before starting MCP server
4. Use `get_page_source` to understand current UI state
5. Screenshots help diagnose visual issues

This context document should be used alongside the existing Cursor rules (.mdc files) for comprehensive project understanding.