// country-flags.js - Direct Implementation
console.log('Country flags script loaded - Direct Implementation');

// Set default country code
window.userCountryCode = 'US';

// Function to get flag emoji from country code
function getFlagEmoji(countryCode) {
    if (!countryCode) return '🇺🇸';
    const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map(char => 127397 + char.charCodeAt())
        .map(code => String.fromCodePoint(code));
    return codePoints.join('');
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
        const response = await fetch('https://ipapi.co/json/');
        if (response.ok) {
            const data = await response.json();
            window.userCountryCode = (data.country_code || 'US').toUpperCase();
            console.log('Country code set to:', window.userCountryCode);
        }
    } catch (error) {
        console.error('Error detecting country:', error);
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
