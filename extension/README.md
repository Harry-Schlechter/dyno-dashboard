# Dyno Dashboard Chrome Extension 🦕

A Chrome extension that provides quick access to your Dyno AI assistant and dashboard features.

## Features

### 🚀 Quick Access
- Instant access to all dashboard pages
- Fast navigation via extension popup
- Keyboard shortcuts for power users

### 💬 Embedded Chat
- Chat widget that can be injected into any webpage
- Context-aware AI assistance
- Keyboard shortcut (Ctrl+Shift+D) to toggle chat
- Floating chat interface with modern design

### 🔍 Bookmark Search
- Quick search through your Chrome bookmarks
- Fuzzy matching for faster results
- Click to open bookmarks in new tabs

### 🔔 Smart Notifications
- Browser notifications for important updates
- Badge notifications on extension icon
- Configurable notification preferences

### ⚙️ Customizable Settings
- Configure dashboard URL
- Set API keys for authenticated requests
- Customize chat widget position and behavior
- Control notification preferences

## Installation

### From Source (Development)

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the `/extension` folder
5. The extension icon should appear in your toolbar

### Configuration

1. Click the extension icon and select "Options" 
2. Set your Dashboard URL (defaults to https://dyno-dashboard.netlify.app)
3. Configure other preferences as needed
4. Save your settings

## Usage

### Popup Interface
- Click the extension icon to open the popup
- Use the chat input to send messages to Dyno AI
- Click quick links to navigate to dashboard pages
- Search bookmarks using the search input

### Embedded Chat Widget
- Press `Ctrl+Shift+D` (or `Cmd+Shift+D` on Mac) on any webpage
- Chat widget slides in from bottom-right corner
- Send messages and receive AI responses
- Click the X to close the widget

### Context Menu
- Right-click on any webpage to see "Open Dyno Dashboard"
- Right-click on selected text to see "Ask Dyno about..."
- Quick access without opening the popup

### Keyboard Shortcuts
- `Ctrl+Shift+D`: Toggle chat widget on current page
- Shortcuts can be customized in Chrome extensions settings

## File Structure

```
extension/
├── manifest.json          # Extension manifest (V3)
├── popup.html             # Extension popup interface
├── popup.js               # Popup functionality
├── background.js          # Service worker for background tasks
├── content.js             # Content script for chat widget
├── options.html           # Settings/options page
├── README.md              # This file
└── icons/                 # Extension icons (16, 32, 48, 128px)
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```

## Permissions

- `activeTab`: To inject chat widget into current tab
- `bookmarks`: To search through user bookmarks
- `storage`: To save user preferences and settings
- `tabs`: To open dashboard pages in new tabs
- `notifications`: To show browser notifications
- `host_permissions`: To inject content scripts on all websites

## Privacy

- The extension only accesses bookmarks when you explicitly search
- No browsing data is transmitted to external servers
- Settings are stored locally in Chrome sync storage
- Chat messages are sent to your configured Dyno AI endpoint only

## Development

### Building Icons
Icons should be provided in 16x16, 32x32, 48x48, and 128x128 pixel sizes in PNG format.

### Testing
1. Load the extension in developer mode
2. Test popup functionality by clicking the icon
3. Test content script by pressing keyboard shortcut on any webpage
4. Test options page by right-clicking the extension icon and selecting "Options"

### Publishing
To publish to Chrome Web Store:
1. Create icons in all required sizes
2. Update manifest.json version
3. Create a developer account on Chrome Web Store
4. Upload the extension as a ZIP file
5. Complete store listing with screenshots and description

## Compatibility

- Chrome 88+ (Manifest V3 support)
- Chromium-based browsers (Edge, Brave, etc.)
- Works on all websites (respects content security policies)

## Future Enhancements

- [ ] Voice input for chat widget
- [ ] Offline mode with cached responses
- [ ] Integration with Chrome history and tabs
- [ ] Custom themes for chat widget
- [ ] Advanced bookmark organization features
- [ ] Cross-device sync with Dyno dashboard

## Support

For issues or feature requests related to the extension, please open an issue in the main repository.
