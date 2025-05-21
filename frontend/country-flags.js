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

// Function to get flag image HTML
function getFlagImage(countryCode) {
    const flagCode = countryCode.toLowerCase();
    return `<img src="https://flagcdn.com/24x18/${flagCode}.png" 
            alt="${countryCode}" 
            title="${countryCode}" 
            style="width: 24px; height: 18px; margin: 0 2px; vertical-align: middle; display: inline-block;">`;
}

// Function to add a flag next to a username
function addFlagToUsername(username) {
    console.log('Attempting to add flag for username:', username);
    const flagImg = getFlagImage(window.userCountryCode || 'US');
    
    // Find the specific system message that contains the username and hasn't been processed yet
    const message = Array.from(document.querySelectorAll('.message.system'))
        .find(msg => msg.textContent.includes(`You are now chatting with ${username}`) && !msg.dataset.flagAdded);
    
    if (!message) {
        console.log('No unprocessed message found for username:', username);
        return;
    }
    
    const isMobileMessage = /Swipe left to skip$/.test(message.textContent);
    
    // Create a wrapper div to preserve the message structure
    const wrapper = document.createElement('div');
    wrapper.innerHTML = message.innerHTML;
    
    // Find the text node containing the username
    const walker = document.createTreeWalker(
        wrapper,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );
    
    let node;
    while (node = walker.nextNode()) {
        if (node.nodeValue.includes(`You are now chatting with ${username}`)) {
            // Create a new text node with the flag image
            const newText = isMobileMessage 
                ? node.nodeValue.replace(
                    new RegExp(`(${username})`), 
                    `${flagImg} $1`
                  )
                : node.nodeValue.replace(
                    new RegExp(`(${username})([^<]*)`), 
                    `$1${flagImg}$2`
                  );
            
            // Replace the text node with our modified version
            node.nodeValue = newText;
            break;
        }
    }
    
    // Update the message content and mark as processed
    message.innerHTML = wrapper.innerHTML;
    message.dataset.flagAdded = 'true';
    console.log('Added flag for username:', username);
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