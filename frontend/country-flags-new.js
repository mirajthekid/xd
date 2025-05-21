// country-flags.js - Fresh Implementation
console.log('Country flags script loaded');

// Will store the detected country code
window.userCountryCode = null;

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
    // Get all message senders that haven't been processed yet
    const usernameElements = document.querySelectorAll('.message-sender:not([data-flag-added])');
    
    usernameElements.forEach(element => {
        // Mark as processed
        element.dataset.flagAdded = 'true';
        
        // Only add flag to other users' messages (not our own)
        const messageElement = element.closest('.message');
        if (messageElement && !messageElement.classList.contains('outgoing')) {
            addFlagToUsername(element, getFlagEmoji(window.userCountryCode));
        }
    });
}

/**
 * Initializes the country flag system
 */
async function initCountryFlags() {
    console.log('Initializing country flags...');
    
    try {
        // Detect user's country
        const response = await fetch('https://ipapi.co/json/');
        if (response.ok) {
            const data = await response.json();
            if (data?.country_code) {
                window.userCountryCode = data.country_code;
                console.log('Detected country:', window.userCountryCode);
            }
        }
    } catch (error) {
        console.error('Error detecting country:', error);
    }
    
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
    
    // Add periodic check as a fallback
    setInterval(processChatMessages, 1000);
}

// Start when the DOM is fully loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCountryFlags);
} else {
    initCountryFlags();
}
