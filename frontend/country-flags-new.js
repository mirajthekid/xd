// country-flags.js - Direct Implementation
console.log('Country flags script loaded - Canadian Flag Test');

// Force Canadian flag for testing
window.userCountryCode = 'CA';
console.log('Forcing Canadian flag (CA) for testing');

// Debug: List of valid country codes for reference
const validCountryCodes = new Set([
    'US', 'GB', 'CA', 'AU', 'DE', 'FR', 'IT', 'ES', 'JP', 'CN', 'RU', 'BR', 'IN', 'TR', 'SA', 'AE', 'EG', 'ZA',
    'CA' // Make sure CA is included
]);

// Function to get flag emoji from country code
function getFlagEmoji(countryCode) {
    console.log('getFlagEmoji called with:', countryCode);
    
    if (!countryCode || !validCountryCodes.has(countryCode)) {
        console.log('Using Earth emoji as fallback for code:', countryCode);
        return '🌍';
    }
    
    try {
        const codePoints = countryCode
            .toUpperCase()
            .split('')
            .map(char => 127397 + char.charCodeAt())
            .map(code => String.fromCodePoint(code));
            
        const flag = codePoints.join('');
        console.log('Generated flag:', flag, 'for code:', countryCode);
        return flag;
    } catch (e) {
        console.error('Error generating flag emoji:', e);
        return '🌍'; // Earth emoji as fallback
    }
}

// Function to add flag to username
function addFlagToMessage() {
    const messages = document.querySelectorAll('.message.system');
    console.log(`Found ${messages.length} system messages`);
    
    messages.forEach(message => {
        if (message.dataset.flagAdded) return;
        
        const text = message.textContent || '';
        const match = text.match(/You are now chatting with (\w+)/i);
        
        if (match && match[1]) {
            const username = match[1];
            const flag = getFlagEmoji(window.userCountryCode);
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            
            console.log(`Processing message for ${username} on ${isMobile ? 'mobile' : 'desktop'}`);
            
            if (isMobile) {
                message.innerHTML = message.innerHTML.replace(
                    new RegExp(`(${username})`),
                    `$1 ${flag}`
                );
            } else {
                message.innerHTML = message.innerHTML.replace(
                    new RegExp(`(${username})`),
                    `$1 ${flag}`
                );
            }
            
            message.dataset.flagAdded = 'true';
            console.log(`Added flag ${flag} for ${username}`);
        }
    });
}

// Detect country using ip-api.com
(async function() {
    try {
        console.log('Starting country detection with ip-api.com...');
        
        const response = await fetch('https://ip-api.com/json/?fields=status,message,countryCode');
        if (response.ok) {
            const data = await response.json();
            console.log('ip-api.com response:', data);
            
            if (data && data.status === 'success' && data.countryCode) {
                window.userCountryCode = data.countryCode.toUpperCase();
                console.log('Country code set (ip-api.com):', window.userCountryCode);
                return;
            }
        }
        
        console.log('Using question mark emoji as fallback');
        window.userCountryCode = null; // Will trigger the question mark fallback
    } catch (error) {
        console.error('Error in country detection:', error);
        window.userCountryCode = null; // Will trigger the question mark fallback
    }
    
    // Initial check
    addFlagToMessage();
    
    // Watch for new messages
    const chatContainer = document.getElementById('chat-messages');
    if (chatContainer) {
        new MutationObserver(addFlagToMessage).observe(chatContainer, {
            childList: true,
            subtree: true
        });
    }
})();
