/**
 * Country Flags for Chat - Complete Solution
 * Displays country flags next to usernames in chat messages
 */

console.log('Country Flags v2.0 - Loading...');

// Global variables
let myCountryCode = 'us'; // Default fallback
let countryCache = {}; // Cache country codes by username

/**
 * Convert country code to emoji flag
 */
function countryCodeToEmoji(cc) {
    if (!cc || cc.length !== 2) return '🌐';
    try {
        // Convert country code to regional indicator symbols
        const emoji = String.fromCodePoint(
            0x1F1E6 + cc.toUpperCase().charCodeAt(0) - 65,
            0x1F1E6 + cc.toUpperCase().charCodeAt(1) - 65
        );
        // If emoji conversion failed, return country code
        if (/^[A-Z]{2}$/.test(emoji)) return cc.toUpperCase();
        return emoji;
    } catch (e) {
        console.error('Emoji conversion failed:', e);
        return cc.toUpperCase();
    }
}

/**
 * Detect user's country using IP geolocation
 */
async function detectMyCountry() {
    try {
        console.log('Detecting country from IP...');
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        
        if (data.country_code) {
            myCountryCode = data.country_code.toLowerCase();
            console.log('Your country detected:', myCountryCode, countryCodeToEmoji(myCountryCode));
            // Cache my country code
            if (window.username) {
                countryCache[window.username] = myCountryCode;
            }
            return myCountryCode;
        }
    } catch (e) {
        console.error('Failed to detect country:', e);
    }
    
    console.log('Using default country: US');
    return 'us';
}

/**
 * Override the displayMessage function to add country flags
 */
function setupMessageInterceptor() {
    // Store the original displayMessage function
    const originalDisplayMessage = window.displayMessage;
    
    if (!originalDisplayMessage) {
        console.error('Could not find displayMessage function');
        return;
    }
    
    // Override the displayMessage function
    window.displayMessage = function(content, sender, type = 'message', timestamp = null) {
        // Create message element
        const messageElement = document.createElement('div');
        messageElement.classList.add('message');
        
        // Add appropriate class based on message type
        if (type === 'system') {
            messageElement.classList.add('system-message');
            
            // Check if this is a "now chatting with" message
            const match = content.match(/You are now chatting with (\w+)/i);
            if (match && match[1]) {
                const partnerUsername = match[1];
                // Add system message with flag
                const systemText = document.createTextNode('You are now chatting with ');
                const usernameSpan = document.createElement('span');
                usernameSpan.textContent = partnerUsername;
                usernameSpan.classList.add('username');
                
                // Add flag for partner (default to globe until we know their country)
                const flagEmoji = countryCodeToEmoji(countryCache[partnerUsername] || '🌐');
                const flagSpan = document.createElement('span');
                flagSpan.textContent = flagEmoji;
                flagSpan.classList.add('country-flag');
                flagSpan.style.marginLeft = '5px';
                flagSpan.style.fontSize = '1.2em';
                flagSpan.style.verticalAlign = 'middle';
                
                messageElement.appendChild(systemText);
                messageElement.appendChild(usernameSpan);
                messageElement.appendChild(flagSpan);
            } else {
                // Regular system message
                messageElement.textContent = content;
            }
        } else {
            // Regular chat message
            if (sender === window.username) {
                // My message
                messageElement.classList.add('outgoing');
                
                // Add username with flag
                const usernameSpan = document.createElement('span');
                usernameSpan.classList.add('username');
                usernameSpan.textContent = sender;
                
                // Add my flag
                const flagEmoji = countryCodeToEmoji(myCountryCode);
                const flagSpan = document.createElement('span');
                flagSpan.textContent = flagEmoji;
                flagSpan.classList.add('country-flag');
                flagSpan.style.marginLeft = '5px';
                flagSpan.style.fontSize = '1.2em';
                flagSpan.style.verticalAlign = 'middle';
                
                // Add message content
                const messageContent = document.createElement('div');
                messageContent.classList.add('message-content');
                messageContent.textContent = content;
                
                messageElement.appendChild(usernameSpan);
                messageElement.appendChild(flagSpan);
                messageElement.appendChild(document.createElement('br'));
                messageElement.appendChild(messageContent);
            } else {
                // Partner message
                messageElement.classList.add('incoming');
                
                // Add username with flag
                const usernameSpan = document.createElement('span');
                usernameSpan.classList.add('username');
                usernameSpan.textContent = sender;
                
                // Add partner flag (use cached country or default)
                const flagEmoji = countryCodeToEmoji(countryCache[sender] || '🌐');
                const flagSpan = document.createElement('span');
                flagSpan.textContent = flagEmoji;
                flagSpan.classList.add('country-flag');
                flagSpan.style.marginLeft = '5px';
                flagSpan.style.fontSize = '1.2em';
                flagSpan.style.verticalAlign = 'middle';
                
                // Add message content
                const messageContent = document.createElement('div');
                messageContent.classList.add('message-content');
                messageContent.textContent = content;
                
                messageElement.appendChild(usernameSpan);
                messageElement.appendChild(flagSpan);
                messageElement.appendChild(document.createElement('br'));
                messageElement.appendChild(messageContent);
            }
        }
        
        // Add timestamp if provided
        if (timestamp) {
            const timestampElement = document.createElement('span');
            timestampElement.classList.add('timestamp');
            timestampElement.textContent = formatTimestamp(timestamp);
            messageElement.appendChild(timestampElement);
        }
        
        // Add to chat messages
        document.getElementById('chat-messages').appendChild(messageElement);
        
        // Scroll to bottom
        document.getElementById('chat-messages').scrollTop = document.getElementById('chat-messages').scrollHeight;
    };
    
    console.log('Message display interceptor set up');
}

/**
 * Override the WebSocket message handler to extract country codes
 */
function setupWebSocketInterceptor() {
    // Store the original handleSocketMessage function
    const originalHandleSocketMessage = window.handleSocketMessage;
    
    if (!originalHandleSocketMessage) {
        console.error('Could not find handleSocketMessage function');
        return;
    }
    
    // Override the handleSocketMessage function
    window.handleSocketMessage = function(event) {
        try {
            const data = JSON.parse(event.data);
            
            // Extract country code if present
            if (data.country_code && data.username) {
                countryCache[data.username] = data.country_code.toLowerCase();
                console.log(`Country code for ${data.username}: ${data.country_code}`);
            }
            
            // If this is a match message, extract partner's country
            if (data.type === 'match' && data.partner && data.partner.country_code) {
                countryCache[data.partner.username] = data.partner.country_code.toLowerCase();
                console.log(`Partner ${data.partner.username} country: ${data.partner.country_code}`);
            }
            
            // If this is a chat message, extract sender's country
            if (data.type === 'chat' && data.sender && data.country_code) {
                countryCache[data.sender] = data.country_code.toLowerCase();
            }
        } catch (e) {
            console.error('Error processing WebSocket message:', e);
        }
        
        // Call the original handler
        return originalHandleSocketMessage(event);
    };
    
    console.log('WebSocket interceptor set up');
}

/**
 * Initialize the country flags system
 */
async function initCountryFlags() {
    console.log('Initializing country flags system...');
    
    // Detect my country
    await detectMyCountry();
    
    // Set up interceptors
    setupMessageInterceptor();
    setupWebSocketInterceptor();
    
    // When username is set, update the cache
    const originalHandleLogin = window.handleLogin;
    if (originalHandleLogin) {
        window.handleLogin = function() {
            const result = originalHandleLogin.apply(this, arguments);
            if (window.username) {
                countryCache[window.username] = myCountryCode;
            }
            return result;
        };
    }
    
    // Add CSS for flag positioning
    const style = document.createElement('style');
    style.textContent = `
        .country-flag {
            display: inline-block;
            margin-left: 5px;
            vertical-align: middle;
            font-size: 1.2em;
        }
        .message .username {
            font-weight: bold;
        }
    `;
    document.head.appendChild(style);
    
    console.log('Country flags system initialized');
}

// Start the system
initCountryFlags();