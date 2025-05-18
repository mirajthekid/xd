// Minimal fix for typing indicator visibility and position on Render
(function() {
    console.log('Typing indicator fix loaded');
    
    // Wait for DOM to be fully loaded
    if (document.readyState === 'complete') {
        applyFix();
    } else {
        window.addEventListener('load', applyFix);
    }
    
    function applyFix() {
        console.log('Applying typing indicator fix');
        
        // Add CSS to ensure typing indicator is visible and positioned correctly
        const styleElement = document.createElement('style');
        styleElement.textContent = `
            /* Create a small, visible typing indicator */
            .typing-indicator {
                position: fixed !important;
                bottom: 70px !important;
                left: 10px !important;
                z-index: 9999 !important;
                background-color: rgba(0, 0, 0, 0.7) !important;
                border-radius: 4px !important;
                padding: 4px 8px !important;
                font-size: 10px !important;
                max-width: 80% !important;
                border: 1px solid var(--accent-color, #00aaff) !important;
            }
            
            /* Ensure visibility when active */
            .typing-indicator.active {
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
            }
            
            /* Style the text */
            #typing-text {
                color: var(--accent-color, #00aaff) !important;
                font-size: 10px !important;
            }
            
            /* Hide the dots */
            .typing-indicator .typing-dot {
                display: none !important;
            }
        `;
        document.head.appendChild(styleElement);
        
        // Helper function to hide the typing indicator
        function hideTypingIndicator(indicator) {
            if (indicator) {
                indicator.classList.remove('active');
                indicator.style.display = 'none';
            }
        }
        
        // Directly patch the handleSocketMessage function to ensure typing indicator works
        const originalHandleSocketMessage = window.handleSocketMessage;
        
        window.handleSocketMessage = function(event) {
            // Call the original function first
            if (originalHandleSocketMessage) {
                originalHandleSocketMessage.call(this, event);
            }
            
            try {
                const data = JSON.parse(event.data);
                
                // Only handle typing events here
                if (data.type === 'typing' && data.username !== window.username) {
                    // Get typing indicator elements
                    const typingIndicator = document.getElementById('typing-indicator');
                    
                    if (!typingIndicator) {
                        return;
                    }
                    
                    if (data.isTyping) {
                        // Show typing indicator with partner's username
                        const typingText = document.getElementById('typing-text');
                        if (typingText) {
                            typingText.textContent = `${data.username} is typing...`;
                        }
                        
                        // Force styles directly
                        typingIndicator.classList.add('active');
                        typingIndicator.style.display = 'block';
                        typingIndicator.style.visibility = 'visible';
                        typingIndicator.style.opacity = '1';
                        typingIndicator.style.position = 'fixed';
                        typingIndicator.style.bottom = '70px';
                        typingIndicator.style.left = '10px';
                        typingIndicator.style.zIndex = '9999';
                        
                        // Add a safety timeout to hide the typing indicator after 5 seconds
                        // in case we miss the 'stop typing' event
                        if (window.typingHideTimeout) {
                            clearTimeout(window.typingHideTimeout);
                        }
                        
                        window.typingHideTimeout = setTimeout(() => {
                            hideTypingIndicator(typingIndicator);
                        }, 5000);
                    } else {
                        // Hide typing indicator when partner stops typing
                        hideTypingIndicator(typingIndicator);
                        
                        // Clear any existing timeout
                        if (window.typingHideTimeout) {
                            clearTimeout(window.typingHideTimeout);
                        }
                    }
                }
            } catch (error) {
                console.error('Fix: Error in typing indicator fix:', error);
            }
        };
        
        // Add a listener for when the chat screen becomes active
        const chatScreen = document.getElementById('chat-screen');
        if (chatScreen) {
            const observer = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                    if (mutation.type === 'attributes' && 
                        mutation.attributeName === 'class' && 
                        chatScreen.classList.contains('active')) {
                        // Ensure the typing indicator is properly positioned
                        const typingIndicator = document.getElementById('typing-indicator');
                        if (typingIndicator) {
                            typingIndicator.style.order = '9999';
                        }
                    }
                }
            });
            
            observer.observe(chatScreen, { 
                attributes: true,
                attributeFilter: ['class']
            });
        }
    }
})();
