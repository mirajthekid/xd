// Country flags feature for typeshi.fun
(function() {
    // Function to convert country code to flag emoji
    function getFlagEmoji(countryCode) {
        if (!countryCode) return '🌐';
        
        // Convert to uppercase and ensure it's a valid country code
        const code = countryCode.toUpperCase();
        if (code.length !== 2) return '🌐';
        
        // Calculate the regional indicator symbols
        const A = 127462; // Unicode for 'A' in regional indicator
        const flag = code
            .toUpperCase()
            .split('')
            .map(char => String.fromCodePoint(char.charCodeAt(0) - 65 + A))
            .join('');
            
        return flag || '🌐'; // Return globe if no flag can be generated
    }
    console.log('Country flags feature loaded');
    
    // Wait for DOM to be fully loaded
    if (document.readyState === 'complete') {
        applyFlagFeature();
    } else {
        window.addEventListener('load', applyFlagFeature);
    }
    
    function applyFlagFeature() {
        console.log('Applying country flags feature');
        
        // Add CSS for flag display
        const styleElement = document.createElement('style');
        styleElement.textContent = `
            .country-flag-emoji {
                display: inline-block;
                margin-left: 5px;
                vertical-align: middle;
                font-size: 14px;
                line-height: 1;
            }
            .message.system {
                display: flex;
                align-items: center;
                justify-content: center;
            }
        `;
        document.head.appendChild(styleElement);
        
        // Store country information
        let userCountry = null;
        
        // Function to get country from the server
        // This assumes your server provides this information in the WebSocket messages
        function getCountryFromServer() {
            // Check if we already have WebSocket data with country info
            if (window.partnerData && window.partnerData.country) {
                return window.partnerData.country;
            }
            
            // If we don't have it yet, we'll use the WebSocket to get it
            if (window.socket && window.socket.readyState === WebSocket.OPEN) {
                // Request country information from the server
                try {
                    window.socket.send(JSON.stringify({
                        type: 'request_country_info'
                    }));
                } catch (error) {
                    console.error('Error requesting country info:', error);
                }
            }
            
            return null;
        }
        
        // Function to add flag to system message
        function addFlagToMessage(message, countryCode) {
            if (!message || !message.textContent.includes('You are now chatting with')) return;
            
            // Extract username
            const match = message.textContent.match(/You are now chatting with (\w+)/);
            if (!match || !match[1]) return;
            
            const username = match[1];
            
            // If we don't have a country code, use a default
            if (!countryCode) {
                countryCode = 'us'; // Default to US
            }
            
            // Create flag element with better styling
            const flagElement = document.createElement('span');
            flagElement.className = 'country-flag-emoji';
            flagElement.textContent = getFlagEmoji(countryCode);
            flagElement.title = countryCode.toUpperCase();
            
            // Add styles dynamically
            const style = document.createElement('style');
            style.textContent = `
                .country-flag-emoji {
                    display: inline-block;
                    margin-left: 5px;
                    vertical-align: middle;
                    font-size: 14px;
                    line-height: 1;
                }
                .message.system {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
            `;
            document.head.appendChild(style);
            
            // Create wrapper for username and flag
            const wrapper = document.createElement('span');
            wrapper.style.display = 'inline-flex';
            wrapper.style.alignItems = 'center';
            wrapper.textContent = username;
            wrapper.appendChild(flagElement);
            
            // Replace text with username + flag
            message.innerHTML = message.textContent.replace(username, wrapper.outerHTML);
        }
        
        // Process existing system messages
        function processExistingMessages() {
            const systemMessages = document.querySelectorAll('.message.system');
            systemMessages.forEach(message => {
                if (message.textContent.includes('You are now chatting with') && 
                    !message.querySelector('.country-flag')) {
                    // Try to get country from server, otherwise use default
                    const countryCode = getCountryFromServer() || 'us';
                    addFlagToMessage(message, countryCode);
                }
            });
        }
        
        // Patch the WebSocket message handler to capture country information
        const originalHandleSocketMessage = window.handleSocketMessage;
        window.handleSocketMessage = function(event) {
            // Call the original handler first
            if (originalHandleSocketMessage) {
                originalHandleSocketMessage.call(this, event);
            }
            
            try {
                const data = JSON.parse(event.data);
                
                // Store partner data if available
                if (data.type === 'partner_connected' && data.username) {
                    // Store the data for later use
                    window.partnerData = data;
                    
                    // Get country code - either from data or use a default
                    const countryCode = (data.country || 'us').toLowerCase();
                    
                    // Find the system message for this user
                    setTimeout(() => {
                        const systemMessages = document.querySelectorAll('.message.system');
                        const connectMessage = Array.from(systemMessages).find(
                            msg => msg.textContent.includes(`You are now chatting with ${data.username}`)
                        );
                        
                        if (connectMessage && !connectMessage.querySelector('.country-flag')) {
                            addFlagToMessage(connectMessage, countryCode);
                        }
                    }, 100); // Small delay to ensure the message is in the DOM
                }
                
                // Handle country info response
                if (data.type === 'country_info' && data.country) {
                    userCountry = data.country.toLowerCase();
                    processExistingMessages();
                }
            } catch (error) {
                console.error('Error in country flags WebSocket handler:', error);
            }
        };
        
        // Watch for new system messages
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1 && 
                            node.classList && 
                            node.classList.contains('message') && 
                            node.classList.contains('system') &&
                            node.textContent.includes('You are now chatting with') &&
                            !node.querySelector('.country-flag')) {
                            
                            // Try to get country from server, otherwise use default
                            const countryCode = getCountryFromServer() || 'us';
                            addFlagToMessage(node, countryCode);
                        }
                    });
                }
            });
        });
        
        // Start observing the chat messages container
        const chatMessages = document.querySelector('.chat-messages');
        if (chatMessages) {
            observer.observe(chatMessages, { childList: true, subtree: true });
        }
        
        // Process any existing messages
        processExistingMessages();
        
        // Also check periodically for new messages
        setInterval(processExistingMessages, 2000);
    }
})();
