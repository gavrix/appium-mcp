# @gavrix/appium-mcp

[![npm version](https://badge.fury.io/js/%40gavrix%2Fappium-mcp.svg)](https://badge.fury.io/js/%40gavrix%2Fappium-mcp)

An Appium MCP (Model-Context-Protocol) server that exposes mobile automation capabilities for both iOS simulators and Android emulators/devices as tools for MCP clients. Enables standardized control and interaction with mobile devices.

This server acts as a bridge, allowing an MCP client (like a Large Language Model or an automation script) to interact with mobile applications through Appium.

## Overview

The primary goal of this project is to provide a set of callable tools over the Model Context Protocol. These tools abstract Appium's functionalities for mobile application testing and automation.

The server supports both iOS simulators and Android emulators/devices with automatic device detection and platform-specific optimizations.

The server is designed to be run via `npx` for ease of use.

## Installation

To use this server as a dependency in your project (though typically it's run standalone via `npx`):

```bash
npm install @gavrix/appium-mcp
```

Or, if you use Yarn:

```bash
yarn add @gavrix/appium-mcp
```

## Usage

The most common way to run the server is using `npx`:

```bash
npx @gavrix/appium-mcp
```

This will start the MCP server, which will then listen for incoming connections from an MCP client (e.g., via stdio).

### For MCP Client Configuration

If you are configuring an MCP client (like Cursor) to use this server, you would typically set the command as follows (assuming the package is installed globally or `npx` is used):

```json
{
  "command": "npx",
  "args": ["@gavrix/appium-mcp"],
  "env": {}
}
```

## Available Tools

The server exposes the following tools to an MCP client:

### Session Management
*   `start_session`: Starts an Appium session with an automatically detected device (iOS simulator or Android emulator/device). Supports platform selection and device targeting.
    - Parameters: `platform` (optional): 'ios', 'android', or 'auto' (default)
    - Parameters: `deviceName` (optional): specific device name to target
*   `end_session`: Ends the current Appium session and cleans up resources.

### App Control
*   `launch_app`: Launches an application using its identifier (bundle ID for iOS, package name for Android).

### Element Interaction
*   `find_element`: Finds a UI element on the current screen using a specified strategy and selector.
*   `tap_element`: Taps or clicks an element identified by its unique element ID.
*   `enter_text`: Enters text into a specific element, like an input field.
*   `get_element_text`: Gets the text content from an element.

### Screen Capture & Analysis
*   `get_page_source`: Retrieves the XML source hierarchy of the current screen.
*   `get_page_source_file`: Saves the page source XML to a specified file path.
*   `get_screenshot`: Captures a screenshot and returns it as base64-encoded data.
*   `get_screenshot_file`: Captures a screenshot and saves it to a specified file path.

### Device Interaction
*   `simulate_gesture`: Simulates custom gestures using W3C WebDriver Actions API with normalized coordinates (0.0-1.0).
*   `press_home_button`: Simulates pressing the home button to send apps to background (iOS and Android).
*   `get_device_logs`: Retrieves console logs from the connected device/simulator.

### Platform-Specific Features

**iOS Support:**
- Automatic detection of booted iOS simulators
- iOS-specific log capture using `xcrun simctl`
- Support for iOS-specific element finding strategies (`-ios class chain`, `-ios predicate string`)

**Android Support:**
- Automatic detection of connected Android devices and emulators
- Android logcat capture
- Support for Android-specific element finding strategies (`-android uiautomator`)

Refer to the tool definitions within the MCP client or the server's source code (`tools/` directory) for detailed schemas and descriptions of each tool.

## Prerequisites

### For iOS Support
- macOS with Xcode and Xcode command line tools installed
- iOS Simulator running
- Appium server running on port 4723

### For Android Support
- Android SDK with ADB installed and available in PATH
- Android emulator running or physical device connected
- Appium server running on port 4723

## Contributing

Contributions, issues, and feature requests are welcome!
Feel free to check [issues page](https://github.com/gavrix/appium-mcp/issues).

## License

This project is [ISC](https://opensource.org/licenses/ISC) licensed.

Author: Sergey Gavrilyuk <sergey.gavrilyuk@gmail.com> 