// country-flags.js - SIMPLE VERSION
console.log('Country flags script loaded');

// Function to add a flag to a username
function addFlagToUsername(username) {
    console.log('Trying to add flag for username:', username);
    
    // Use Turkish flag by default for testing
    const countryCode = 'tr';
    
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
    
    console.log('Created flag image with src:', flagImg.src);
    
    // Find all elements that contain the username
    const elements = document.querySelectorAll('*');
    let found = false;
    
    elements.forEach(element => {
        if (element.textContent && element.textContent.includes(username) && !element.dataset.flagAdded) {
            console.log('Found username element:', element);
            element.parentNode.insertBefore(flagImg.cloneNode(true), element.nextSibling);
            element.dataset.flagAdded = 'true';
            found = true;
        }
    });
    
    if (!found) {
        console.log('Could not find username in the DOM');
    }
}

// Function to check for new messages
function checkForMessages() {
    console.log('Checking for messages...');
    const messages = document.querySelectorAll('div');
    
    messages.forEach(message => {
        const text = message.textContent || '';
        const match = text.match(/You are now chatting with (\w+)/i);
        
        if (match && match[1] && !message.dataset.flagChecked) {
            const username = match[1];
            console.log('Found message with username:', username);
            addFlagToUsername(username);
            message.dataset.flagChecked = 'true';
        }
    });
}

// Run when the page loads
console.log('Initializing country flags...');

// Initial check
checkForMessages();

// Check every second
const interval = setInterval(checkForMessages, 1000);

// Stop checking after 30 seconds
setTimeout(() => {
    clearInterval(interval);
    console.log('Stopped checking for messages');
}, 30000);
