// Country flags feature for Ephemeral Chat
(function() {
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
            .country-flag {
                display: inline-block;
                margin-left: 5px;
                vertical-align: middle;
                width: 16px;
                height: 16px;
            }
            
            .username-with-flag {
                display: inline-flex;
                align-items: center;
            }
        `;
        document.head.appendChild(styleElement);
        
        // Cache for IP to country mapping
        const ipCountryCache = {};
        
        // Function to get country from IP
        async function getCountryFromIP(ip) {
            // Check cache first
            if (ipCountryCache[ip]) {
                return ipCountryCache[ip];
            }
            
            try {
                // Use a free IP geolocation API
                const response = await fetch(`https://ipapi.co/${ip}/json/`);
                const data = await response.json();
                
                if (data && data.country_code) {
                    // Store in cache
                    ipCountryCache[ip] = data.country_code.toLowerCase();
                    return data.country_code.toLowerCase();
                }
                
                return null;
            } catch (error) {
                console.error('Error fetching country data:', error);
                return null;
            }
        }
        
        // Function to create flag element
        function createFlagElement(countryCode) {
            if (!countryCode) return null;
            
            const flagElement = document.createElement('img');
            flagElement.className = 'country-flag';
            flagElement.src = `https://flagcdn.com/16x12/${countryCode}.png`;
            flagElement.alt = countryCode.toUpperCase();
            flagElement.title = countryCode.toUpperCase();
            
            return flagElement;
        }
        
        // Function to update system message with flag
        function updateSystemMessageWithFlag(message, username, countryCode) {
            if (!message || !username || !countryCode) return;
            
            // Check if message contains the username
            if (message.textContent.includes(username)) {
                // Create wrapper for username and flag
                const wrapper = document.createElement('span');
                wrapper.className = 'username-with-flag';
                
                // Get the flag element
                const flagElement = createFlagElement(countryCode);
                if (!flagElement) return;
                
                // Replace text with username + flag
                const newText = message.textContent.replace(
                    username,
                    ''
                );
                
                message.textContent = newText;
                wrapper.textContent = username;
                wrapper.appendChild(flagElement);
                
                // Insert at the appropriate position
                if (message.textContent.startsWith('You are now chatting with ')) {
                    message.textContent = 'You are now chatting with ';
                    message.appendChild(wrapper);
                }
            }
        }
        
        // Patch the handleSocketMessage function to add flags
        const originalHandleSocketMessage = window.handleSocketMessage;
        
        window.handleSocketMessage = function(event) {
            // Call the original function first
            if (originalHandleSocketMessage) {
                originalHandleSocketMessage.call(this, event);
            }
            
            try {
                const data = JSON.parse(event.data);
                
                // Handle partner connected event
                if (data.type === 'partner_connected' && data.username && data.ip) {
                    // Get system message element
                    const systemMessages = document.querySelectorAll('.message.system');
                    const connectMessage = Array.from(systemMessages).find(
                        msg => msg.textContent.includes(`You are now chatting with ${data.username}`)
                    );
                    
                    if (connectMessage) {
                        // Get country from IP and update message
                        getCountryFromIP(data.ip).then(countryCode => {
                            if (countryCode) {
                                updateSystemMessageWithFlag(connectMessage, data.username, countryCode);
                            }
                        });
                    }
                }
            } catch (error) {
                console.error('Error in country flags feature:', error);
            }
        };
        
        // Also handle existing system messages (in case we load after connection)
        setTimeout(() => {
            const systemMessages = document.querySelectorAll('.message.system');
            systemMessages.forEach(message => {
                const match = message.textContent.match(/You are now chatting with (\w+)/);
                if (match && match[1]) {
                    const username = match[1];
                    
                    // Since we don't have the IP in this case, we'll use a fallback
                    // This is just for demonstration - in a real implementation,
                    // you would need to store the IP when the connection is made
                    fetch('https://api.ipify.org?format=json')
                        .then(response => response.json())
                        .then(data => {
                            if (data.ip) {
                                getCountryFromIP(data.ip).then(countryCode => {
                                    if (countryCode) {
                                        updateSystemMessageWithFlag(message, username, countryCode);
                                    }
                                });
                            }
                        })
                        .catch(error => {
                            console.error('Error getting IP:', error);
                        });
                }
            });
        }, 1000);
    }
})();
