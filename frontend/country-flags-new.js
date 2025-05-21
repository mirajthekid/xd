// country-flags.js - Optimized Implementation
console.log('Country flags script loaded');

// Will store the detected country code
window.userCountryCode = 'US'; // Default fallback

// Start country detection in the background
fetch('https://ipapi.co/json/')
    .then(response => response.json())
    .then(data => {
        if (data?.country_code) {
            window.userCountryCode = data.country_code;
            console.log('Detected country:', window.userCountryCode);
            // Update any existing messages with the new flag
            processChatMessages();
        }
    })
    .catch(error => {
        console.error('Error detecting country:', error);
    });

/**
 * Converts a country code to a flag emoji
 * @param {string} countryCode - ISO 3166-1 alpha-2 country code
 * @returns {string} Flag emoji or 🌍 if invalid
 */
function getFlagEmoji(countryCode) {
    if (!countryCode) return '🌍';
    
    const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map(char => 127397 + char.charCodeAt(0))
        .map(code => String.fromCodePoint(code));
    
    return codePoints.join('');
}

/**
 * Adds a flag emoji to a username element
 * @param {HTMLElement} usernameElement - The element containing the username
 * @param {string} flag - The flag emoji to add
 */
function addFlagToUsername(usernameElement, flag) {
    if (!usernameElement || !flag) return;
    
    // Only add flag if not already present
    if (!usernameElement.textContent.includes(flag)) {
        usernameElement.textContent = `${usernameElement.textContent.trim()} ${flag}`;
    }
}

/**
 * Processes all chat messages to add country flags
 */
function processChatMessages() {
    // Process both system and regular messages
    const messages = document.querySelectorAll('.message:not([data-flag-processed])');
    
    messages.forEach(message => {
        // Mark as processed
        message.dataset.flagProcessed = 'true';
        
        // Handle system messages (like "You are now chatting with...")
        if (message.classList.contains('system')) {
            const text = message.textContent || '';
            const match = text.match(/You are now chatting with (\w+)/i) || 
                       text.match(/Chatting with (\w+)/i) ||
                       text.match(/(\w+) joined the chat/i);
            
            if (match && match[1]) {
                const flag = getFlagEmoji(window.userCountryCode);
                message.textContent = `${message.textContent} ${flag}`;
            }
            return;
        }
        
        // Handle regular chat messages
        const senderElement = message.querySelector('.message-sender');
        if (!senderElement) return;
        
        // Only add flag to incoming messages (other users' messages)
        if (message.classList.contains('incoming')) {
            const flag = getFlagEmoji(window.userCountryCode);
            addFlagToUsername(senderElement, flag);
        }
    });
}

/**
 * Initializes the country flag system
 */
function initCountryFlags() {
    console.log('Initializing country flags...');
    
    // Initial processing of messages
    processChatMessages();
    
    // Set up mutation observer to handle new messages
    const chatContainer = document.getElementById('chat-messages');
    if (chatContainer) {
        const observer = new MutationObserver(() => {
            processChatMessages();
        });
        
        observer.observe(chatContainer, {
            childList: true,
            subtree: true
        });
    }
}

// Start when the DOM is fully loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCountryFlags);
} else {
    initCountryFlags();
}
