// country-flags.js - Direct Implementation
console.log('Country flags script loaded - Debug Version');

// Set default to Earth emoji
window.userCountryCode = null;

// Debug: List of valid country codes for reference
const validCountryCodes = new Set([
    'US', 'GB', 'CA', 'AU', 'DE', 'FR', 'IT', 'ES', 'JP', 'CN', 'RU', 'BR', 'IN', 'TR', 'SA', 'AE', 'EG', 'ZA'
    // Add more country codes as needed
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

// Detect country
(async function() {
    try {
        console.log('Starting country detection...');
        
        // Try ipapi.co first (more reliable)
        try {
            console.log('Trying ipapi.co...');
            const response = await fetch('https://ipapi.co/json/');
            if (response.ok) {
                const data = await response.json();
                console.log('ipapi.co response:', data);
                if (data && data.country_code) {
                    window.userCountryCode = data.country_code.toUpperCase();
                    console.log('Country code set (ipapi.co):', window.userCountryCode);
                    return;
                }
            }
        } catch (e) {
            console.warn('ipapi.co failed, trying fallback...', e);
        }
        
        // Fallback to ipinfo.io
        try {
            console.log('Trying ipinfo.io...');
            const fallbackResponse = await fetch('https://ipinfo.io/json?token=2c6c2a2d4b9a4d');
            if (fallbackResponse.ok) {
                const data = await fallbackResponse.json();
                console.log('ipinfo.io response:', data);
                if (data && data.country) {
                    window.userCountryCode = data.country.toUpperCase();
                    console.log('Country code set (ipinfo.io):', window.userCountryCode);
                    return;
                }
            }
        } catch (e) {
            console.warn('ipinfo.io failed', e);
        }
        
        console.log('Using Earth emoji as fallback - no valid country code found');
    } catch (error) {
        console.error('Error in country detection:', error);
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
