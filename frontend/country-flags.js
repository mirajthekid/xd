// country-flags.js
console.log('Country flags script loaded - SIMPLE VERSION');

// Function to add a flag next to a username
function addFlagToUsername(username) {
    try {
        // Try to detect country from browser language
        const language = (navigator.language || navigator.userLanguage || 'en-US').split('-')[1] || 'us';
        const countryCode = language.toLowerCase();
        
        console.log(`Adding flag for username: ${username}, country: ${countryCode}`);
        
        // Create flag image
        const flagImg = document.createElement('img');
        flagImg.src = `https://flagcdn.com/24x18/${countryCode}.png`;
        flagImg.alt = countryCode.toUpperCase();
        flagImg.title = `From ${countryCode.toUpperCase()}`;
        flagImg.className = 'country-flag';
        flagImg.style.width = '24px';
        flagImg.style.height = '18px';
        flagImg.style.marginLeft = '5px';
        flagImg.style.verticalAlign = 'middle';
        
        // Find the username element and add the flag after it
        const usernameElements = document.querySelectorAll('*');
        for (const element of usernameElements) {
            if (element.textContent && element.textContent.includes(username)) {
                // Check if we haven't already added a flag to this element
                if (!element.dataset.flagAdded) {
                    // Clone the flag node for each match
                    element.parentNode.insertBefore(flagImg.cloneNode(true), element.nextSibling);
                    element.dataset.flagAdded = 'true';
                }
            }
        }
    } catch (error) {
        console.error('Error adding flag:', error);
    }
}

// Function to check for new messages and add flags
function checkForMessages() {
    // Look for system messages that contain "You are now chatting with"
    const messages = document.querySelectorAll('.system-message, .message.system, .chat-message');
    
    messages.forEach(message => {
        const text = message.textContent || '';
        const match = text.match(/You are now chatting with (\w+)/i);
        
        if (match && match[1] && !message.dataset.flagChecked) {
            const username = match[1];
            addFlagToUsername(username);
            message.dataset.flagChecked = 'true';
        }
    });
}

// Run when the page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('Country flags initialized');
    
    // Initial check
    checkForMessages();
    
    // Set up a mutation observer to watch for new messages
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.addedNodes.length) {
                checkForMessages();
            }
        });
    });
    
    // Start observing the document with the configured parameters
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    // Also check periodically in case the observer misses something
    setInterval(checkForMessages, 2000);
});
