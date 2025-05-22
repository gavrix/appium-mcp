# @gavrix/appium-mcp

[![npm version](https://badge.fury.io/js/%40gavrix%2Fappium-mcp.svg)](https://badge.fury.io/js/%40gavrix%2Fappium-mcp)

An Appium MCP (Model-Context-Protocol) server that exposes mobile automation capabilities (iOS simulators, with potential Android support) as tools for MCP clients. Enables standardized control and interaction with mobile devices.

This server acts as a bridge, allowing an MCP client (like a Large Language Model or an automation script) to interact with mobile applications through Appium.

## Overview

The primary goal of this project is to provide a set of callable tools over the Model Context Protocol. These tools abstract Appium's functionalities for mobile application testing and automation.

Currently, the server primarily targets iOS simulators, with plans to expand to Android devices.

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

*   `start_session`: Starts an Appium session with an automatically detected booted iOS simulator.
*   `launch_app`: Launches an application on the active Appium session using its bundle ID.
*   `get_page_source`: Retrieves the XML source hierarchy of the current screen.
*   `find_element`: Finds a UI element on the current screen using a specified strategy and selector.
*   `tap_element`: Taps or clicks an element identified by its unique element ID.
*   `get_screenshot`: Captures a screenshot of the current screen.
*   `get_device_logs`: Retrieves console logs from the connected device/simulator.
*   `simulate_gesture`: Simulates a custom gesture on the device.
*   `end_session`: Ends the current Appium session.

Refer to the tool definitions within the MCP client or the server's source code (`tools/` directory) for detailed schemas and descriptions of each tool.


## Contributing

Contributions, issues, and feature requests are welcome!
Feel free to check [issues page](https://github.com/gavrix/appium-mcp/issues).

## License

This project is [ISC](https://opensource.org/licenses/ISC) licensed.

Author: Sergey Gavrilyuk <sergey.gavrilyuk@gmail.com> 