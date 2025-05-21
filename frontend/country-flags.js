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
    'pt': '🇵🇹', 'gr': '🇬🇷', 'ch': '🇨🇭', 'at': '🇦🇹', 'ie': '🇮🇪',
    'il': '🇮🇱', 'eg': '🇪🇬', 'za': '🇿🇦', 'ke': '🇰🇪', 'ma': '🇲🇦'
};

// Function to get flag emoji from country code
function getFlagEmoji(countryCode) {
    if (!countryCode) return '🌐';
    return flagEmojis[countryCode.toLowerCase()] || '🌐';
}

// Function to detect user's country (simplified version)
async function detectCountry() {
    try {
        // Try to get from browser's language settings first
        const language = navigator.language || navigator.userLanguage || 'en-US';
        const parts = language.split('-');
        if (parts.length > 1) {
            const countryCode = parts[1].toLowerCase();
            console.log('Detected country from browser language:', countryCode);
            return countryCode;
        }
        
        // If no country in language, try to get from timezone
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
        const timezoneParts = timezone.split('/');
        if (timezoneParts.length > 1) {
            const countryFromTz = timezoneParts[0].toLowerCase();
            console.log('Detected country from timezone:', countryFromTz);
            return countryFromTz;
        }
        
        console.log('Using default country code: us');
        return 'us'; // Default fallback
        
    } catch (error) {
        console.error('Error detecting country:', error);
        return 'us';
    }
}

// Function to add flags to messages
async function addFlagsToMessages() {
    // Find all system messages
    const messages = document.querySelectorAll('.system-message, .message.system, .chat-message');
    
    for (const message of messages) {
        const text = message.textContent || message.innerText || '';
        const match = text.match(/You are now chatting with (\w+)/i);
        
        if (match && match[1] && !message.dataset.flagAdded) {
            const username = match[1];
            const countryCode = await detectCountry();
            const flag = getFlagEmoji(countryCode);
            
            console.log(`Adding flag ${flag} for username: ${username}, country: ${countryCode}`);
            
            // Create flag element
            const flagSpan = document.createElement('span');
            flagSpan.className = 'country-flag';
            flagSpan.textContent = ` ${flag}`;
            flagSpan.title = `From ${countryCode.toUpperCase()}`;
            
            // Add flag after the username
            const newContent = message.innerHTML.replace(
                new RegExp(`(${username})(?![^<]*>|[^<>]*<\/span>)`, 'i'), 
                `$1${flagSpan.outerHTML}`
            );
            
            // Only update if we actually made a replacement
            if (newContent !== message.innerHTML) {
                message.innerHTML = newContent;
                message.dataset.flagAdded = 'true';
            }
        }
    }
}

// Run when the page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing country flags...');
    
    // Initial run
    addFlagsToMessages();
    
    // Also run after a short delay in case messages load dynamically
    let retryCount = 0;
    const maxRetries = 5;
    const retryInterval = setInterval(() => {
        console.log(`Checking for messages (attempt ${retryCount + 1}/${maxRetries})...`);
        addFlagsToMessages();
        retryCount++;
        if (retryCount >= maxRetries) {
            clearInterval(retryInterval);
            console.log('Stopped checking for messages after max retries');
        }
    }, 1000);
    
    // Set up a mutation observer to handle dynamically added messages
    const observer = new MutationObserver((mutations) => {
        let shouldCheck = false;
        mutations.forEach((mutation) => {
            if (mutation.addedNodes.length > 0) {
                shouldCheck = true;
            }
        });
        
        if (shouldCheck) {
            console.log('DOM changed, checking for new messages...');
            addFlagsToMessages();
        }
    });
    
    // Start observing the chat container for changes
    const chatContainer = document.getElementById('chat-messages') || document.body;
    observer.observe(chatContainer, {
        childList: true,
        subtree: true,
        characterData: true
    });
    
    console.log('Country flags initialized');
});
