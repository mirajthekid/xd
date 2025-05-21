// country-flags.js
console.log('Country flags script loaded');

// Simple mapping of country codes to flag emojis
const flagEmojis = {
    'us': '🇺🇸', 'gb': '🇬🇧', 'ca': '🇨🇦', 'au': '🇦🇺', 'de': '🇩🇪',
    'fr': '🇫🇷', 'it': '🇮🇹', 'es': '🇪🇸', 'jp': '🇯🇵', 'kr': '🇰🇷',
    'cn': '🇨🇳', 'in': '🇮🇳', 'br': '🇧🇷', 'ru': '🇷🇺', 'tr': '🇹🇷',
    'sa': '🇸🇦', 'ae': '🇦🇪', 'eg': '🇪🇬', 'za': '🇿🇦', 'ng': '🇳🇬',
    'mx': '🇲🇽', 'ar': '🇦🇷', 'cl': '🇨🇱', 'co': '🇨🇴', 'pe': '🇵🇪',
    've': '🇻🇪', 'nz': '🇳🇿', 'sg': '🇸🇬', 'my': '🇲🇾', 'th': '🇹🇭',
    'id': '🇮🇩', 'ph': '🇵🇭', 'vn': '🇻🇳', 'nl': '🇳🇱', 'be': '🇧🇪',
    'se': '🇸🇪', 'no': '🇳🇴', 'dk': '🇩🇰', 'fi': '🇫🇮', 'pl': '🇵🇱',
    'pt': '🇵🇹', 'gr': '🇬🇷', 'ch': '🇨🇭', 'at': '🇦🇹', 'ie': '🇮🇪'
};

// Function to get flag emoji from country code
function getFlagEmoji(countryCode) {
    if (!countryCode) return '🌐';
    return flagEmojis[countryCode.toLowerCase()] || '🌐';
}

// Detect country using a simple API
async function detectCountry() {
    try {
        // Try IP-API first
        const response = await fetch('https://ipapi.co/json/');
        if (response.ok) {
            const data = await response.json();
            if (data && data.country_code) {
                return data.country_code.toLowerCase();
            }
        }
        return 'us'; // Default to US if detection fails
    } catch (error) {
        console.error('Error detecting country:', error);
        return 'us';
    }
}

// Main function to add flags to chat messages
async function addFlagsToMessages() {
    // Find all system messages
    const messages = document.querySelectorAll('.system-message, .message.system');
    
    for (const message of messages) {
        const text = message.textContent || message.innerText;
        const match = text.match(/You are now chatting with (\w+)/i);
        
        if (match && match[1] && !message.dataset.flagAdded) {
            const username = match[1];
            const countryCode = await detectCountry();
            const flag = getFlagEmoji(countryCode);
            
            console.log(`Adding flag ${flag} for country ${countryCode}`);
            
            // Create flag element
            const flagSpan = document.createElement('span');
            flagSpan.className = 'country-flag';
            flagSpan.textContent = ` ${flag}`;
            flagSpan.title = `From ${countryCode.toUpperCase()}`;
            
            // Add some basic styling
            flagSpan.style.marginLeft = '4px';
            flagSpan.style.fontSize = '1.2em';
            
            // Add flag after the username
            message.innerHTML = message.innerHTML.replace(
                new RegExp(`(${username})(?![^<]*>|[^<>]*<\/span>)`, 'i'), 
                `$1${flagSpan.outerHTML}`
            );
            
            // Mark as processed
            message.dataset.flagAdded = 'true';
        }
    }
}

// Run when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // Initial run
    addFlagsToMessages();
    
    // Also run after a short delay in case messages load dynamically
    setTimeout(addFlagsToMessages, 2000);
    
    // Set up a mutation observer to handle dynamically added messages
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.addedNodes.length) {
                addFlagsToMessages();
            }
        });
    });
    
    // Start observing the chat container for changes
    const chatContainer = document.getElementById('chat-messages') || document.body;
    observer.observe(chatContainer, {
        childList: true,
        subtree: true
    });
});
