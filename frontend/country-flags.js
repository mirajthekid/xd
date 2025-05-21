// country-flags.js - Simple and reliable flag display
console.log('Country flags script loaded - Debug Version');

// Debug: Check if script is loaded
console.log('Script loaded, checking user agent:', navigator.userAgent);

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
    if (!username) {
        console.log('No username provided to addFlagToUsername');
        return;
    }
    
    console.log('Adding flag for username:', username);
    
    // Find the system message containing the username
    const messages = document.querySelectorAll('.message.system');
    console.log(`Found ${messages.length} system messages to check`);
    
    messages.forEach((message, index) => {
        const messageText = message.textContent || '';
        console.log(`Checking message ${index + 1}:`, messageText.substring(0, 100) + '...');
        
        if (messageText.includes(`You are now chatting with ${username}`)) {
            console.log('Found matching message for username:', username);
            
            if (message.dataset.flagAdded) {
                console.log('Flag already added to this message');
                return;
            }
            
            const flagEmoji = getFlagEmoji(window.userCountryCode || 'US');
            console.log('Generated flag emoji:', flagEmoji);
            
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            console.log('Is mobile device:', isMobile);
            
            if (isMobile) {
                console.log('Processing mobile layout');
                // For mobile, place flag after username and before the period
                const newHtml = message.innerHTML.replace(
                    new RegExp(`(${username})(\.?)(\\s*Swipe left to skip)`),
                    `$1 ${flagEmoji}$2$3`
                );
                message.innerHTML = newHtml;
                console.log('Updated message HTML for mobile');
            } else {
                console.log('Processing desktop layout');
                // For desktop, place flag after username
                const newHtml = message.innerHTML.replace(
                    new RegExp(`(${username})`),
                    `$1 ${flagEmoji}`
                );
                message.innerHTML = newHtml;
                console.log('Updated message HTML for desktop');
            }
            
            message.dataset.flagAdded = 'true';
            console.log('Successfully added flag for username:', username);
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