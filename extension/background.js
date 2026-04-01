chrome.runtime.onInstalled.addListener(function(details) {
    console.log("Dyno Dashboard Extension installed:", details.reason);
    
    // Set default configuration
    if (details.reason === "install") {
        chrome.storage.sync.set({
            dashboardUrl: "https://dyno-dashboard.netlify.app",
            chatEnabled: true,
            notificationsEnabled: true
        });
        
        // Show welcome notification
        chrome.notifications.create({
            type: "basic",
            iconUrl: "icons/icon48.png",
            title: "🦕 Dyno Dashboard",
            message: "Extension installed! Click the icon to start using Dyno."
        });
    }
});

// Handle extension icon clicks (opens popup)
chrome.action.onClicked.addListener(function(tab) {
    // This won't be called when popup is set, but keeping for reference
    console.log("Extension icon clicked on tab:", tab.url);
});

// Context menu setup
chrome.runtime.onInstalled.addListener(function() {
    // Add context menu item for quick access
    chrome.contextMenus.create({
        id: "openDashboard",
        title: "Open Dyno Dashboard",
        contexts: ["page", "selection"]
    });
    
    chrome.contextMenus.create({
        id: "askDyno",
        title: "Ask Dyno about '%s'",
        contexts: ["selection"]
    });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(function(info, tab) {
    switch (info.menuItemId) {
        case "openDashboard":
            chrome.storage.sync.get(["dashboardUrl"], function(result) {
                const dashboardUrl = result.dashboardUrl || "https://dyno-dashboard.netlify.app";
                chrome.tabs.create({ url: dashboardUrl });
            });
            break;
            
        case "askDyno":
            if (info.selectionText) {
                // In a real implementation, this would send the selection to Dyno AI
                chrome.tabs.sendMessage(tab.id, {
                    action: "showChatWidget",
                    message: `Tell me about: ${info.selectionText}`
                });
            }
            break;
    }
});

// Handle messages from content script or popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    switch (request.action) {
        case "openDashboardPage":
            chrome.storage.sync.get(["dashboardUrl"], function(result) {
                const baseUrl = result.dashboardUrl || "https://dyno-dashboard.netlify.app";
                const url = request.page ? `${baseUrl}/${request.page}` : baseUrl;
                chrome.tabs.create({ url: url });
            });
            sendResponse({ success: true });
            break;
            
        case "searchBookmarks":
            chrome.bookmarks.search(request.query, function(results) {
                sendResponse({ bookmarks: results });
            });
            return true; // Keep message channel open for async response
            
        case "getSettings":
            chrome.storage.sync.get(null, function(settings) {
                sendResponse({ settings: settings });
            });
            return true;
            
        case "saveSettings":
            chrome.storage.sync.set(request.settings, function() {
                sendResponse({ success: true });
            });
            return true;
            
        default:
            console.log("Unknown action:", request.action);
            sendResponse({ error: "Unknown action" });
    }
});

// Keyboard shortcuts
chrome.commands.onCommand.addListener(function(command) {
    switch (command) {
        case "open-dashboard":
            chrome.storage.sync.get(["dashboardUrl"], function(result) {
                const dashboardUrl = result.dashboardUrl || "https://dyno-dashboard.netlify.app";
                chrome.tabs.create({ url: dashboardUrl });
            });
            break;
            
        case "toggle-chat":
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                chrome.tabs.sendMessage(tabs[0].id, {action: "toggleChatWidget"});
            });
            break;
    }
});

// Badge management
function updateBadge() {
    // In a real implementation, this could show unread messages or notifications
    chrome.storage.local.get(["unreadCount"], function(result) {
        const count = result.unreadCount || 0;
        if (count > 0) {
            chrome.action.setBadgeText({ text: count.toString() });
            chrome.action.setBadgeBackgroundColor({ color: "#ef4444" });
        } else {
            chrome.action.setBadgeText({ text: "" });
        }
    });
}

// Update badge periodically
setInterval(updateBadge, 30000); // Every 30 seconds

// Initial badge update
updateBadge();
