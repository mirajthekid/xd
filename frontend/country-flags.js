// country-flags.js - New Version
console.log('Country flags script loaded - New Version');

// Global variable to store the country code
window.userCountryCode = 'US'; // Default fallback

// Function to get country code from IP
async function detectCountry() {
    try {
        console.log('Detecting country...');
        // Using ipapi.co service (free tier available)
        const response = await fetch('https://ipapi.co/json/');
        if (!response.ok) throw new Error('Failed to fetch location data');
        
        const data = await response.json();
        console.log('IP Geolocation data:', data);
        
        // Store the country code globally
        userCountryCode = data.country_code ? data.country_code.toUpperCase() : 'US';
        console.log('Country code set to:', userCountryCode);
        
        // Return the flag emoji
        return getFlagEmoji(userCountryCode);
    } catch (error) {
        console.error('Error detecting country:', error);
        return 'https://flagcdn.com/24x18/us.png'; // Default to US flag on error
    }
}

// Function to convert country code to flag emoji
function getFlagEmoji(countryCode) {
    // Convert country code to flag emoji
    const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map(char => 127397 + char.charCodeAt())
        .map(code => String.fromCodePoint(code));
    return codePoints.join('');
}

// Function to add a flag next to a username
function addFlagToUsername(username) {
    console.log('Attempting to add flag for username:', username);
    
    // Create flag emoji span
    const flagSpan = document.createElement('span');
    flagSpan.className = 'country-flag-emoji';
    flagSpan.title = `From ${userCountryCode}`;
    flagSpan.textContent = getFlagEmoji(userCountryCode);
    flagSpan.style.marginLeft = '5px';
    flagSpan.style.verticalAlign = 'middle';
    
    // Try to find the username in the chat messages
    const chatMessages = document.getElementById('chat-messages') || document.body;
    const textNodes = [];
    
    // Find all text nodes that contain the username
    const walker = document.createTreeWalker(
        chatMessages,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );
    
    let node;
    while (node = walker.nextNode()) {
        if (node.nodeValue.includes(`You are now chatting with ${username}`)) {
            textNodes.push(node);
        }
    }
    
    // Add flag next to each found username
    textNodes.forEach(textNode => {
        const parent = textNode.parentNode;
        if (parent && !parent.dataset.flagAdded) {
            // Insert the flag after the username
            const range = document.createRange();
            range.setStartAfter(textNode);
            range.insertNode(flagSpan.cloneNode(true));
            parent.dataset.flagAdded = 'true';
            console.log('Added flag for username:', username);
        }
    });
    
    if (textNodes.length === 0) {
        console.log('Username not found in chat messages');
    }
}

// Function to check for new messages and add flags
function checkForNewMessages() {
    const messages = document.querySelectorAll('.system-message, .message, [class*="chat-message"]');
    
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