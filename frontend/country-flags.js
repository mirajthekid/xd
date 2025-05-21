// country-flags.js - Simple and reliable flag display
console.log('Country flags script loaded');

// Global variable to store the country code
window.userCountryCode = 'US'; // Default fallback

// Function to convert country code to flag emoji
function getFlagEmoji(countryCode) {
    if (!countryCode || typeof countryCode !== 'string') return '';
    const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map(char => 127397 + char.charCodeAt())
        .map(code => String.fromCodePoint(code));
    return codePoints.join('');
}

// Function to add a flag next to a username
function addFlagToUsername(username) {
    if (!username) return;
    
    console.log('Adding flag for username:', username);
    
    // Find the system message containing the username
    const messages = document.querySelectorAll('.message.system');
    messages.forEach(message => {
        if (message.textContent.includes(`You are now chatting with ${username}`) && !message.dataset.flagAdded) {
            const flagEmoji = getFlagEmoji(window.userCountryCode || 'US');
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            
            if (isMobile) {
                // For mobile, place flag after username and before the period
                message.innerHTML = message.innerHTML
                    .replace(
                        new RegExp(`(${username})(\.?)(\\s*Swipe left to skip)`),
                        `$1 ${flagEmoji}$2$3`
                    );
            } else {
                // For desktop, place flag after username
                message.innerHTML = message.innerHTML.replace(
                    new RegExp(`(${username})`),
                    `$1 ${flagEmoji}`
                );
            }
            
            message.dataset.flagAdded = 'true';
            console.log('Added flag for username:', username);
        }
    });
}

// Function to check for new messages and add flags
function checkForNewMessages() {
    const messages = document.querySelectorAll('.message.system');
    messages.forEach(message => {
        const text = message.textContent || '';
        const match = text.match(/You are now chatting with (\w+)/i);
        
        if (match && match[1] && !message.dataset.flagChecked) {
            const username = match[1];
            console.log('Found new message with username:', username);
            addFlagToUsername(username);
            message.dataset.flagChecked = 'true';
        }
    });
}

// Initialize when the page loads
console.log('Initializing country flags...');

// Detect country first
detectCountry().then(() => {
    console.log('Country detection complete, starting message monitoring...');
    
    // Initial check
    checkForNewMessages();
    
    // Set up a mutation observer to watch for new messages
    const observer = new MutationObserver((mutations) => {
        let shouldCheck = false;
        mutations.forEach((mutation) => {
            if (mutation.addedNodes.length) {
                shouldCheck = true;
            }
        });
        
        if (shouldCheck) {
            checkForNewMessages();
        }
    });
    
    // Start observing the chat container
    const chatContainer = document.getElementById('chat-messages') || document.body;
    observer.observe(chatContainer, {
        childList: true,
        subtree: true,
        characterData: true
    });
    
    // Also check periodically as a fallback
    const interval = setInterval(checkForNewMessages, 3000);
    
    // Stop checking after 2 minutes
    setTimeout(() => {
        clearInterval(interval);
        console.log('Stopped checking for new messages');
    }, 120000);
});