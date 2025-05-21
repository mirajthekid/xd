// country-flags.js - Direct Implementation
console.log('Country flags script loaded - Direct Implementation');

// Set default to Earth emoji
window.userCountryCode = null;

// Function to get flag emoji from country code
function getFlagEmoji(countryCode) {
    if (!countryCode) return '🌍'; // Earth emoji as fallback
    try {
        const codePoints = countryCode
            .toUpperCase()
            .split('')
            .map(char => 127397 + char.charCodeAt())
            .map(code => String.fromCodePoint(code));
        return codePoints.join('');
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
        console.log('Detecting country...');
        // Try ipinfo.io first
        const response = await fetch('https://ipinfo.io/json?token=2c6c2a2d4b9a4d');
        if (response.ok) {
            const data = await response.json();
            if (data && data.country) {
                window.userCountryCode = data.country.toUpperCase();
                console.log('Country code set to (ipinfo):', window.userCountryCode);
                return;
            }
        }
        
        // Fallback to ipapi.co
        const fallbackResponse = await fetch('https://ipapi.co/json/');
        if (fallbackResponse.ok) {
            const data = await fallbackResponse.json();
            if (data && data.country_code) {
                window.userCountryCode = data.country_code.toUpperCase();
                console.log('Country code set to (ipapi):', window.userCountryCode);
            }
        }
    } catch (error) {
        console.error('Error detecting country:', error);
        // Keep the Earth emoji as fallback
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
