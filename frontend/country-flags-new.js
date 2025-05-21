// country-flags.js - Direct Implementation
console.log('Country flags script loaded');

// List of all valid ISO 3166-1 alpha-2 country codes
const validCountryCodes = new Set([
    'AD', 'AE', 'AF', 'AG', 'AI', 'AL', 'AM', 'AO', 'AQ', 'AR', 'AS', 'AT', 'AU',
    'AW', 'AX', 'AZ', 'BA', 'BB', 'BD', 'BE', 'BF', 'BG', 'BH', 'BI', 'BJ', 'BL', 'BM',
    'BN', 'BO', 'BQ', 'BR', 'BS', 'BT', 'BV', 'BW', 'BY', 'BZ', 'CA', 'CC', 'CD', 'CF',
    'CG', 'CH', 'CI', 'CK', 'CL', 'CM', 'CN', 'CO', 'CR', 'CU', 'CV', 'CW', 'CX', 'CY',
    'CZ', 'DE', 'DJ', 'DK', 'DM', 'DO', 'DZ', 'EC', 'EE', 'EG', 'EH', 'ER', 'ES', 'ET',
    'FI', 'FJ', 'FK', 'FM', 'FO', 'FR', 'GA', 'GB', 'GD', 'GE', 'GF', 'GG', 'GH', 'GI',
    'GL', 'GM', 'GN', 'GP', 'GQ', 'GR', 'GS', 'GT', 'GU', 'GW', 'GY', 'HK', 'HM', 'HN',
    'HR', 'HT', 'HU', 'ID', 'IE', 'IL', 'IM', 'IN', 'IO', 'IQ', 'IR', 'IS', 'IT', 'JE',
    'JM', 'JO', 'JP', 'KE', 'KG', 'KH', 'KI', 'KM', 'KN', 'KP', 'KR', 'KW', 'KY', 'KZ',
    'LA', 'LB', 'LC', 'LI', 'LK', 'LR', 'LS', 'LT', 'LU', 'LV', 'LY', 'MA', 'MC', 'MD',
    'ME', 'MF', 'MG', 'MH', 'MK', 'ML', 'MM', 'MN', 'MO', 'MP', 'MQ', 'MR', 'MS', 'MT',
    'MU', 'MV', 'MW', 'MX', 'MY', 'MZ', 'NA', 'NC', 'NE', 'NF', 'NG', 'NI', 'NL', 'NO',
    'NP', 'NR', 'NU', 'NZ', 'OM', 'PA', 'PE', 'PF', 'PG', 'PH', 'PK', 'PL', 'PM', 'PN',
    'PR', 'PS', 'PT', 'PW', 'PY', 'QA', 'RE', 'RO', 'RS', 'RU', 'RW', 'SA', 'SB', 'SC',
    'SD', 'SE', 'SG', 'SH', 'SI', 'SJ', 'SK', 'SL', 'SM', 'SN', 'SO', 'SR', 'SS', 'ST',
    'SV', 'SX', 'SY', 'SZ', 'TC', 'TD', 'TF', 'TG', 'TH', 'TJ', 'TK', 'TL', 'TM', 'TN',
    'TO', 'TR', 'TT', 'TV', 'TW', 'TZ', 'UA', 'UG', 'UM', 'US', 'UY', 'UZ', 'VA', 'VC',
    'VE', 'VG', 'VI', 'VN', 'VU', 'WF', 'WS', 'XK', 'YE', 'YT', 'ZA', 'ZM', 'ZW'
]);

// Will be set after country detection
window.userCountryCode = null;

// Function to get flag emoji from country code
function getFlagEmoji(countryCode) {
    console.log('getFlagEmoji called with:', countryCode);
    
    if (!countryCode) {
        console.log('No country code provided, using fallback');
        return '🌍'; // Earth emoji as fallback
    }
    
    // Convert to uppercase for consistency
    const upperCode = countryCode.toUpperCase();
    
    if (!validCountryCodes.has(upperCode)) {
        console.log('Country code not in valid list, using fallback:', countryCode);
        return '🌍'; // Earth emoji as fallback
    }
    
    try {
        // Convert country code to regional indicator symbols
        const codePoints = Array.from(upperCode)
            .map(char => 127397 + char.charCodeAt(0))
            .map(code => String.fromCodePoint(code));
            
        const flag = codePoints.join('');
        console.log('Generated flag:', flag, 'for code:', upperCode);
        return flag;
    } catch (e) {
        console.error('Error generating flag emoji:', e);
        return '🌍'; // Earth emoji as fallback
    }
}

// Function to add flag to username
function addFlagToMessage() {
    // Get all messages that haven't been processed yet
    const messages = document.querySelectorAll('.message:not([data-flag-added])');
    console.log(`Found ${messages.length} messages to process`);
    
    messages.forEach(message => {
        // Mark as processed immediately to avoid duplicate processing
        message.dataset.flagAdded = 'true';
        
        // Handle system messages (e.g., "You are now chatting with...")
        if (message.classList.contains('system')) {
            const text = message.textContent || '';
            const match = text.match(/You are now chatting with (\w+)/i) || 
                       text.match(/Chatting with (\w+)/i) ||
                       text.match(/(\w+) joined the chat/i);
            
            if (match && match[1]) {
                const username = match[1];
                const flag = getFlagEmoji(window.userCountryCode);
                console.log(`Processing system message for ${username}`);
                
                // Update the message content with the flag
                message.innerHTML = message.innerHTML.replace(
                    new RegExp(`(${username})(?![^<]*>)`, 'g'),
                    `$1 ${flag}`
                );
            }
            return;
        }
        
        // Handle regular chat messages
        const senderElement = message.querySelector('.message-sender');
        if (!senderElement) return;
        
        const username = senderElement.textContent.replace(':', '').trim();
        const isCurrentUser = message.classList.contains('outgoing');
        
        // Only add flags to other users' messages
        if (!isCurrentUser && username) {
            const flag = getFlagEmoji(window.userCountryCode);
            console.log(`Adding flag to message from ${username}`);
            
            // Add flag after the username
            senderElement.innerHTML = senderElement.innerHTML.replace(
                new RegExp(`(${username})`, 'g'),
                `$1 ${flag}`
            );
        }
    });
}

// Function to initialize the flag system
async function initFlagSystem() {
    try {
        console.log('Starting country detection with ipapi.co...');
        
        // Wait for a short delay to ensure the page is fully loaded
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Try to detect country
        try {
            const response = await fetch('https://ipapi.co/json/');
            if (response.ok) {
                const data = await response.json();
                console.log('ipapi.co response:', data);
                
                if (data && data.country_code) {
                    window.userCountryCode = data.country_code.toUpperCase();
                    console.log('Country code set (ipapi.co):', window.userCountryCode);
                }
            }
        } catch (error) {
            console.error('Error in country detection:', error);
            window.userCountryCode = null;
        }
        
        // Add a small delay to ensure chat messages are loaded
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Initial check
        console.log('Running initial check...');
        addFlagToMessage();
        
        // Watch for new messages
        const chatContainer = document.getElementById('chat-messages') || 
                             document.querySelector('.chat-messages') ||
                             document.body;
        
        console.log('Chat container found:', chatContainer);
        
        if (chatContainer) {
            // Immediate check
            addFlagToMessage();
            
            // Set up observer for dynamic content
            const observer = new MutationObserver((mutations) => {
                console.log('DOM mutation detected, checking for new messages...');
                // Add a small delay to allow new messages to be fully rendered
                setTimeout(addFlagToMessage, 100);
            });
            
            observer.observe(chatContainer, {
                childList: true,
                subtree: true,
                characterData: true
            });
            
            console.log('MutationObserver set up on container');
            
            // Additional check after a delay to catch any missed messages
            setTimeout(addFlagToMessage, 2000);
        } else {
            console.error('No chat container found in the DOM');
        }
        
    } catch (error) {
        console.error('Error initializing flag system:', error);
    }
}

// Start the flag system when the DOM is fully loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFlagSystem);
} else {
    initFlagSystem();
}
