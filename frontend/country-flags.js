// country-flags.js - New Version
console.log('Country flags script loaded - New Version');

// Global variable to store the country code
let userCountryCode = 'us'; // Default fallback

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
        userCountryCode = data.country_code ? data.country_code.toLowerCase() : 'us';
        console.log('Country code set to:', userCountryCode);
        
        // Return the flag URL for immediate use if needed
        return `https://flagcdn.com/24x18/${userCountryCode}.png`;
    } catch (error) {
        console.error('Error detecting country:', error);
        return 'https://flagcdn.com/24x18/us.png'; // Default to US flag on error
    }
}

// Function to add a flag next to a username
function addFlagToUsername(username) {
    console.log('Attempting to add flag for username:', username);
    // Create flag image
    const flagImg = document.createElement('img');
    flagImg.src = `https://flagcdn.com/24x18/${userCountryCode}.png`;
    flagImg.alt = userCountryCode.toUpperCase();
    flagImg.title = `From ${userCountryCode.toUpperCase()}`;
    flagImg.className = 'country-flag';
    flagImg.style.width = '24px';
    flagImg.style.height = '18px';
    flagImg.style.marginLeft = '5px';
    flagImg.style.verticalAlign = 'middle';

    // Try to find username as a span or strong or b element (common in chat UIs)
    let found = false;
    const possibleSelectors = [
        `span.username`,
        `strong`,
        `b`,
        `span`,
        `div`,
        `p`
    ];
    possibleSelectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => {
            if (el.textContent.trim() === username && !el.dataset.flagAdded) {
                el.insertAdjacentElement('afterend', flagImg.cloneNode(true));
                el.dataset.flagAdded = 'true';
                found = true;
                console.log('Flag added after element:', el);
            }
        });
    });

    // Fallback: try to match username in system messages
    if (!found) {
        const systemMessages = document.querySelectorAll('.system-message, .message, [class*="chat-message"]');
        systemMessages.forEach(msg => {
            if (msg.textContent.includes(username) && !msg.dataset.flagAdded) {
                msg.appendChild(flagImg.cloneNode(true));
                msg.dataset.flagAdded = 'true';
                found = true;
                console.log('Flag added in fallback to message:', msg);
            }
        });
    }

    if (!found) {
        console.warn('Could not find username element to add flag:', username);
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