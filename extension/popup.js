document.addEventListener("DOMContentLoaded", function() {
    const chatInput = document.getElementById("chatInput");
    const sendButton = document.getElementById("sendMessage");
    const bookmarkSearch = document.getElementById("bookmarkSearch");
    const bookmarkResults = document.getElementById("bookmarkResults");
    const quickLinks = document.querySelectorAll(".quick-link");
    
    // Dashboard base URL - this would be configurable in a real extension
    const DASHBOARD_URL = "https://dyno-dashboard.netlify.app";
    
    // Send chat message
    sendButton.addEventListener("click", sendChatMessage);
    chatInput.addEventListener("keypress", function(e) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendChatMessage();
        }
    });
    
    function sendChatMessage() {
        const message = chatInput.value.trim();
        if (!message) return;
        
        // In a real implementation, this would send the message to Dyno AI
        // For now, we'll show a placeholder response
        alert(`Message sent to Dyno: "${message}"\n\nThis is a placeholder - the real integration would send this to Dyno AI and show the response.`);
        chatInput.value = "";
    }
    
    // Handle quick links
    quickLinks.forEach(link => {
        link.addEventListener("click", function(e) {
            e.preventDefault();
            const page = this.dataset.page;
            const url = page === "dashboard" ? DASHBOARD_URL : `${DASHBOARD_URL}/${page}`;
            
            chrome.tabs.create({ url: url });
        });
    });
    
    // Bookmark search functionality
    let searchTimeout;
    bookmarkSearch.addEventListener("input", function() {
        const query = this.value.trim();
        
        clearTimeout(searchTimeout);
        
        if (query.length < 2) {
            bookmarkResults.innerHTML = "";
            return;
        }
        
        searchTimeout = setTimeout(() => {
            searchBookmarks(query);
        }, 300);
    });
    
    function searchBookmarks(query) {
        chrome.bookmarks.search(query, function(results) {
            displayBookmarkResults(results.slice(0, 5)); // Show max 5 results
        });
    }
    
    function displayBookmarkResults(bookmarks) {
        if (bookmarks.length === 0) {
            bookmarkResults.innerHTML = `
                <div style="padding: 12px; text-align: center; color: #64748b; font-size: 13px;">
                    No bookmarks found
                </div>
            `;
            return;
        }
        
        const bookmarkHTML = bookmarks.map(bookmark => {
            if (!bookmark.url) return ""; // Skip folders
            
            return `
                <div class="bookmark-item" data-url="${bookmark.url}">
                    <div class="bookmark-title">${escapeHtml(bookmark.title || "Untitled")}</div>
                    <div class="bookmark-url">${escapeHtml(bookmark.url)}</div>
                </div>
            `;
        }).join("");
        
        bookmarkResults.innerHTML = bookmarkHTML;
        
        // Add click handlers to bookmark items
        bookmarkResults.querySelectorAll(".bookmark-item").forEach(item => {
            item.addEventListener("click", function() {
                const url = this.dataset.url;
                chrome.tabs.create({ url: url });
            });
        });
    }
    
    function escapeHtml(text) {
        const div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Load user settings
    chrome.storage.sync.get(["dashboardUrl"], function(result) {
        if (result.dashboardUrl) {
            DASHBOARD_URL = result.dashboardUrl;
        }
    });
    
    // Focus chat input on popup open
    chatInput.focus();
});
