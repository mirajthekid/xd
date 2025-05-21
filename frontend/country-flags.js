// country-flags.js - IP Geolocation Version
console.log('Country flags script loaded - IP Geolocation');

// Function to get country code from IP
async function getCountryFromIP() {
    try {
        // Using ipapi.co service (free tier available)
        const response = await fetch('https://ipapi.co/json/');
        if (!response.ok) throw new Error('Failed to fetch location data');
        
        const data = await response.json();
        console.log('IP Geolocation data:', data);
        
        // Return the country code (e.g., 'TR', 'US')
        return data.country_code.toLowerCase();
    } catch (error) {
        console.error('Error getting country from IP:', error);
        return 'us'; // Default fallback
    }
}

// Function to add a flag to a username
async function addFlagToUsername(username) {
    try {
        console.log('Adding flag for username:', username);
        
        // Get country code from IP
        const countryCode = await getCountryFromIP();
        console.log('Detected country code:', countryCode);
        
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
        
        // Find all elements that contain the username
        const elements = document.querySelectorAll('*');
        let found = false;
        
        elements.forEach(element => {
            if (element.textContent && 
                element.textContent.includes(username) && 
                !element.dataset.flagAdded) {
                
                console.log('Found username element, adding flag');
                element.parentNode.insertBefore(flagImg.cloneNode(true), element.nextSibling);
                element.dataset.flagAdded = 'true';
                found = true;
            }
        });
        
        if (!found) {
            console.log('Could not find username in the DOM');
        }
    } catch (error) {
        console.error('Error in addFlagToUsername:', error);
    }
}

// Function to check for new messages
function checkForMessages() {
    console.log('Checking for messages...');
    
    // Look for messages in all divs
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

// Initialize when the page loads
console.log('Initializing country flags...');

// Initial check
checkForMessages();

// Check every 2 seconds for new messages
const interval = setInterval(checkForMessages, 2000);

// Stop checking after 1 minute
setTimeout(() => {
    clearInterval(interval);
    console.log('Stopped checking for messages');
}, 60000);