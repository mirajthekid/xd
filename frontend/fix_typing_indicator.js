// Enhanced typing indicator functionality with robust error handling and debugging
(function() {
    // Add comprehensive debugging for typing indicator
    console.log('Typing indicator fix script loaded');
    
    // Store original functions to patch them
    const originalHandleSocketMessage = window.handleSocketMessage;
    const originalSendTypingStatus = window.sendTypingStatus;
    const originalHandleTypingEvent = window.handleTypingEvent;
    
    // Enhanced typing event handler
    window.handleTypingEvent = function() {
        console.log('handleTypingEvent called');
        
        // Make sure we're in a chat room
        if (!window.roomId || !window.partnerUsername) {
            console.log('Not in a chat room, ignoring typing event');
            return;
        }
        
        console.log('Current room ID:', window.roomId);
        console.log('Current partner username:', window.partnerUsername);
        
        // Force a small delay to ensure the DOM is ready
        setTimeout(() => {
            // Get the input element directly
            const input = document.getElementById('message-input');
            if (!input) {
                console.error('Message input not found in handleTypingEvent');
                return;
            }
            
            // Check if typing state has changed
            const currentlyTyping = input.value.length > 0;
            console.log('Current typing state:', currentlyTyping, 'Previous state:', window.isTyping);
            
            // Clear any existing typing timeout
            if (window.typingTimer) {
                clearTimeout(window.typingTimer);
            }
            
            // Only send if typing state changed
            if (currentlyTyping !== window.isTyping) {
                window.isTyping = currentlyTyping;
                window.sendTypingStatus(window.isTyping);
            }
            
            // If user is typing, set a timeout to clear typing status after inactivity
            if (window.isTyping) {
                window.typingTimer = setTimeout(() => {
                    window.isTyping = false;
                    window.sendTypingStatus(false);
                    console.log('Typing timeout reached, set isTyping to false');
                }, 1000); // 1 second of inactivity before stopping typing indicator
            }
        }, 10); // Small delay to ensure DOM is ready
    };
    
    // Enhanced typing status sender
    window.sendTypingStatus = function(isTyping) {
        console.log('sendTypingStatus called with isTyping =', isTyping);
        
        if (!window.socket || window.socket.readyState !== WebSocket.OPEN) {
            console.error('Socket not available for sending typing status');
            return;
        }
        
        if (!window.roomId) {
            console.error('No roomId available for sending typing status');
            return;
        }
        
        if (!window.username) {
            console.error('No username available for sending typing status');
            return;
        }
        
        const typingMessage = {
            type: 'typing',
            isTyping: isTyping,
            username: window.username,
            roomId: window.roomId
        };
        
        console.log('Sending typing message:', typingMessage);
        
        try {
            window.socket.send(JSON.stringify(typingMessage));
            console.log(`Sent typing status: ${isTyping ? 'typing' : 'stopped typing'}`);
        } catch (error) {
            console.error('Error sending typing status:', error);
        }
    };
    
    // Enhanced socket message handler for typing events
    window.handleSocketMessage = function(event) {
        try {
            // Call original function if it exists
            if (originalHandleSocketMessage) {
                originalHandleSocketMessage.call(this, event);
            }
            
            const rawData = event.data;
            let data;
            
            try {
                data = JSON.parse(rawData);
            } catch (e) {
                console.error('Error parsing WebSocket message:', e);
                return;
            }
            
            // Only handle typing events here, let the original function handle the rest
            if (data.type === 'typing') {
                console.log('Received typing event:', data);
                
                // Get DOM elements with null checks
                const typingIndicator = document.getElementById('typing-indicator');
                const typingText = document.getElementById('typing-text');
                
                if (!typingIndicator || !typingText) {
                    console.error('Typing indicator elements not found:', {
                        typingIndicator,
                        typingText
                    });
                    return;
                }
                
                // Don't show our own typing indicator
                if (data.username === window.username) {
                    console.log('Ignoring own typing status');
                    return;
                }
                
                if (data.isTyping) {
                    // Show typing indicator with partner's username
                    console.log('Showing typing indicator for:', data.username);
                    typingText.textContent = `${data.username} is typing...`;
                    typingIndicator.classList.add('active');
                    
                    // Log the element state after change
                    console.log('Typing indicator after showing:', {
                        element: typingIndicator,
                        display: window.getComputedStyle(typingIndicator).display,
                        classes: typingIndicator.className
                    });
                } else {
                    // Hide typing indicator
                    console.log('Hiding typing indicator');
                    typingIndicator.classList.remove('active');
                }
            }
        } catch (error) {
            console.error('Error in enhanced handleSocketMessage:', error);
        }
    };
    
    // Update WebSocket URL to use our improved function
    if (window.getWebSocketUrl) {
        console.log('Original WS_URL:', window.WS_URL);
        window.WS_URL = window.getWebSocketUrl();
        console.log('Updated WS_URL:', window.WS_URL);
    }
    
    console.log('Typing indicator fixes applied');
})();
