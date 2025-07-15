# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2025-01-15

### Added
- **`press_home_button` Tool**: Simulates pressing the home button on both iOS and Android devices
  - iOS: Uses `mobile: pressButton` command
  - Android: Uses `pressKeyCode(3)` for HOME key
  - Sends apps to background without ending the session

- **Enhanced `simulate_gesture` Tool**: Now uses normalized coordinates for better cross-device compatibility
  - Coordinates are specified as values between 0.0 and 1.0
  - Automatically scales to device screen dimensions
  - Makes gestures portable across different screen sizes

- **CLAUDE.md Documentation**: Comprehensive context document for AI agents
  - Project structure and architecture details
  - Tool descriptions and usage patterns
  - Development guidelines and best practices

### Changed
- Improved gesture simulation to be more intuitive and device-agnostic

## [0.2.0] - 2025-01-15

### Added
- **Full Android Support**: The server now supports both iOS simulators and Android emulators/devices
  - Automatic detection of connected Android devices and emulators
  - Android-specific log capture using `adb logcat`
  - Support for Android-specific element finding strategies (`-android uiautomator`)
  - API level to version mapping for better device identification

- **New Tools**:
  - `get_page_source_file`: Saves the page source XML to a specified file path
  - `get_screenshot_file`: Captures a screenshot and saves it to a specified file path (previously base64 only)

- **Enhanced `start_session` Tool**:
  - Now accepts `platform` parameter: 'ios', 'android', or 'auto' (default)
  - Now accepts `deviceName` parameter to target specific devices
  - Automatic platform detection when set to 'auto'
  - Better device selection logic for both platforms

### Changed
- Improved logging system with separate log files for iOS (`device_console.log`) and Android (`android_logcat.log`)
- Updated shared state to include `currentPlatform` and `currentDevice` for better session management
- Enhanced error messages to be more descriptive and platform-aware
- Tool dependencies now include platform-specific helpers

### Fixed
- Better error handling for missing devices or platforms
- Improved cleanup of device log processes on session end
- More robust device detection for both iOS and Android

## [0.1.0] - 2024-12-22

### Initial Release
- Basic iOS simulator support
- Core tools for mobile automation:
  - `start_session`: Start Appium session with iOS simulator
  - `launch_app`: Launch apps by bundle ID
  - `get_page_source`: Get XML hierarchy
  - `find_element`: Find UI elements
  - `tap_element`: Tap elements
  - `enter_text`: Input text
  - `get_element_text`: Extract text from elements
  - `get_screenshot`: Capture screenshots (base64)
  - `get_device_logs`: Retrieve device logs
  - `simulate_gesture`: Perform gestures
  - `end_session`: End Appium session
- MCP (Model Context Protocol) server implementation
- WebdriverIO integration for Appium control