// Dyno Dashboard Chrome Extension Content Script
(function() {
    let chatWidget = null;
    let isWidgetVisible = false;
    
    // Initialize when DOM is ready
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
    
    function init() {
        createChatWidget();
        setupMessageListener();
    }
    
    function createChatWidget() {
        // Only create if not already exists
        if (document.getElementById("dyno-chat-widget")) return;
        
        chatWidget = document.createElement("div");
        chatWidget.id = "dyno-chat-widget";
        chatWidget.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 350px;
            height: 500px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.15);
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: none;
            border: 1px solid #e2e8f0;
        `;
        
        chatWidget.innerHTML = `
            <div style="
                background: linear-gradient(135deg, #3b82f6, #1d4ed8);
                color: white;
                padding: 16px;
                border-radius: 12px 12px 0 0;
                display: flex;
                justify-content: space-between;
                align-items: center;
            ">
                <div>
                    <div style="font-weight: 600; font-size: 16px;">🦕 Dyno Chat</div>
                    <div style="font-size: 12px; opacity: 0.9;">AI Assistant</div>
                </div>
                <button id="dyno-close" style="
                    background: none;
                    border: none;
                    color: white;
                    font-size: 18px;
                    cursor: pointer;
                    padding: 4px;
                    border-radius: 4px;
                    opacity: 0.8;
                " onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.8'">×</button>
            </div>
            <div id="dyno-chat-messages" style="
                height: 350px;
                overflow-y: auto;
                padding: 16px;
                background: #f8fafc;
            ">
                <div style="
                    background: white;
                    padding: 12px;
                    border-radius: 8px;
                    margin-bottom: 8px;
                    border-left: 3px solid #3b82f6;
                ">
                    <div style="font-size: 14px; color: #1e293b;">
                        👋 Hi! I'm Dyno, your AI assistant. This is a placeholder chat widget.
                    </div>
                    <div style="font-size: 12px; color: #64748b; margin-top: 4px;">
                        The real integration would connect to your Dyno AI system.
                    </div>
                </div>
            </div>
            <div style="
                padding: 16px;
                border-top: 1px solid #e2e8f0;
                background: white;
                border-radius: 0 0 12px 12px;
            ">
                <div style="display: flex; gap: 8px;">
                    <input type="text" id="dyno-input" placeholder="Type your message..." style="
                        flex: 1;
                        padding: 8px 12px;
                        border: 1px solid #d1d5db;
                        border-radius: 6px;
                        outline: none;
                        font-size: 14px;
                    " />
                    <button id="dyno-send" style="
                        background: #3b82f6;
                        color: white;
                        border: none;
                        padding: 8px 16px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 14px;
                        font-weight: 500;
                    ">Send</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(chatWidget);
        
        // Add event listeners
        const closeBtn = chatWidget.querySelector("#dyno-close");
        const sendBtn = chatWidget.querySelector("#dyno-send");
        const input = chatWidget.querySelector("#dyno-input");
        
        closeBtn.addEventListener("click", hideChatWidget);
        sendBtn.addEventListener("click", sendMessage);
        input.addEventListener("keypress", function(e) {
            if (e.key === "Enter") {
                sendMessage();
            }
        });
        
        // Prevent page scrolling when widget is open
        chatWidget.addEventListener("wheel", function(e) {
            e.stopPropagation();
        });
    }
    
    function showChatWidget(message = "") {
        if (!chatWidget) createChatWidget();
        
        chatWidget.style.display = "block";
        isWidgetVisible = true;
        
        if (message) {
            const input = chatWidget.querySelector("#dyno-input");
            input.value = message;
            input.focus();
        }
        
        // Add animation
        chatWidget.style.transform = "translateY(20px)";
        chatWidget.style.opacity = "0";
        
        setTimeout(() => {
            chatWidget.style.transition = "all 0.3s ease";
            chatWidget.style.transform = "translateY(0)";
            chatWidget.style.opacity = "1";
        }, 10);
    }
    
    function hideChatWidget() {
        if (!chatWidget) return;
        
        chatWidget.style.transition = "all 0.3s ease";
        chatWidget.style.transform = "translateY(20px)";
        chatWidget.style.opacity = "0";
        
        setTimeout(() => {
            chatWidget.style.display = "none";
            isWidgetVisible = false;
        }, 300);
    }
    
    function toggleChatWidget() {
        if (isWidgetVisible) {
            hideChatWidget();
        } else {
            showChatWidget();
        }
    }
    
    function sendMessage() {
        const input = chatWidget.querySelector("#dyno-input");
        const messagesContainer = chatWidget.querySelector("#dyno-chat-messages");
        const message = input.value.trim();
        
        if (!message) return;
        
        // Add user message
        const userMessage = document.createElement("div");
        userMessage.style.cssText = `
            background: #3b82f6;
            color: white;
            padding: 8px 12px;
            border-radius: 8px;
            margin-bottom: 8px;
            margin-left: 20%;
            text-align: right;
            font-size: 14px;
        `;
        userMessage.textContent = message;
        messagesContainer.appendChild(userMessage);
        
        // Clear input
        input.value = "";
        
        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        // Add placeholder response after delay
        setTimeout(() => {
            const botMessage = document.createElement("div");
            botMessage.style.cssText = `
                background: white;
                padding: 12px;
                border-radius: 8px;
                margin-bottom: 8px;
                border-left: 3px solid #10b981;
                font-size: 14px;
                color: #1e293b;
            `;
            botMessage.innerHTML = `
                <div>I received your message: "${message}"</div>
                <div style="font-size: 12px; color: #64748b; margin-top: 4px;">
                    This is a placeholder response. The real Dyno AI would provide personalized answers based on your life data.
                </div>
            `;
            messagesContainer.appendChild(botMessage);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }, 1000);
    }
    
    function setupMessageListener() {
        chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
            switch (request.action) {
                case "showChatWidget":
                    showChatWidget(request.message);
                    sendResponse({ success: true });
                    break;
                    
                case "hideChatWidget":
                    hideChatWidget();
                    sendResponse({ success: true });
                    break;
                    
                case "toggleChatWidget":
                    toggleChatWidget();
                    sendResponse({ success: true });
                    break;
                    
                default:
                    sendResponse({ error: "Unknown action" });
            }
        });
    }
    
    // Add keyboard shortcut listener
    document.addEventListener("keydown", function(e) {
        // Ctrl/Cmd + Shift + D to toggle chat widget
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "D") {
            e.preventDefault();
            toggleChatWidget();
        }
    });
    
})();
