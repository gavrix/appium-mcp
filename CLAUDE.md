# Appium MCP Server - AI Agent Context

This document provides comprehensive context for AI agents (Claude, Cursor, etc.) working with the Appium MCP (Model Context Protocol) server project.

## Project Overview

This is an Appium MCP server that exposes mobile automation capabilities as standardized tools for MCP clients. It acts as a bridge between MCP clients (like LLMs or automation scripts) and mobile applications through Appium.

### Key Features
- **Primary Target**: iOS simulators (Android support planned)
- **Protocol**: Model Context Protocol (MCP)
- **Main Purpose**: Enable AI/automation tools to interact with mobile apps
- **Installation**: Designed to run via `npx @gavrix/appium-mcp`

## Project Structure

```
appium-mcp/
├── server.js              # Main entry point - initializes MCP server and loads tools
├── tools/                 # Individual tool implementations
│   ├── startSession.js    # Starts Appium session with iOS simulator
│   ├── launchApp.js       # Launches app by bundle ID
│   ├── getPageSource.js   # Gets XML source hierarchy
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
└── .cursor/rules/         # Cursor IDE specific rules
    ├── project-overview.mdc
    ├── project-structure.mdc
    └── adding-new-tools.mdc
```

## Architecture Details

### Core Components

1. **Server.js**:
   - Initializes `McpServer` with stdio transport
   - Sets up shared state (`appiumDriver`, `deviceLogProcess`)
   - Configures tool dependencies (`logToFile`, `zod`, `fsPromises`)
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

4. **Dependencies**:
   - `logToFile`: Centralized logging function
   - `zod`: Schema validation library
   - `fsPromises`: Async file operations

## Available Tools

1. **start_session**: Initializes Appium with auto-detected iOS simulator
2. **launch_app**: Opens app using bundle ID
3. **get_page_source**: Returns XML hierarchy of current screen
4. **find_element**: Locates UI elements using various strategies
5. **tap_element**: Performs tap/click on element by ID
6. **get_screenshot**: Captures and returns base64 screenshot
7. **get_screenshot_file**: Saves screenshot to specified file path
8. **get_device_logs**: Retrieves recent device console logs
9. **simulate_gesture**: Performs custom touch gestures
10. **end_session**: Cleanly terminates Appium session
11. **enter_text**: Inputs text into focused element
12. **get_element_text**: Extracts text content from element
13. **press_home_button**: Simulates iOS home button press

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
- macOS with Xcode installed (for iOS simulators)
- Appium server running locally
- Node.js runtime

## Important Notes

1. **Session Management**: Only one Appium session at a time
2. **iOS Focus**: Currently optimized for iOS simulators
3. **React Native**: Special log filtering for RN apps
4. **Error Recovery**: Tools should fail gracefully without crashing server
5. **Async Operations**: All tool handlers must be async

## Recent Changes

Based on git status:
- Added home button simulation tool
- Improved swiping/gesture tools
- Added screenshot file saving capability
- Implemented element text extraction
- Added text input functionality with setValue

## Debugging Tips

1. Check `mcp-server.log` for detailed execution logs
2. Monitor `device_console.log` for app-specific issues
3. Verify Appium server is running before starting MCP server
4. Use `get_page_source` to understand current UI state
5. Screenshots help diagnose visual issues

This context document should be used alongside the existing Cursor rules (.mdc files) for comprehensive project understanding.