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
    const messages = document.querySelectorAll('.message.system, .message');
    console.log(`Found ${messages.length} messages to process`);
    
    messages.forEach(message => {
        if (message.dataset.flagAdded) return;
        
        const text = message.textContent || '';
        console.log('Processing message text:', text);
        
        // Try different patterns to find the username
        let match = text.match(/You are now chatting with (\w+)/i) || 
                   text.match(/Chatting with (\w+)/i) ||
                   text.match(/(\w+) joined the chat/i);
        
        if (match && match[1]) {
            const username = match[1];
            const flag = getFlagEmoji(window.userCountryCode);
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            
            console.log(`Found username: ${username}, adding flag: ${flag} (${isMobile ? 'mobile' : 'desktop'})`);
            
            // Create a temporary div to safely manipulate the HTML
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = message.innerHTML;
            
            // Find and update all text nodes that contain the username
            const walker = document.createTreeWalker(
                tempDiv,
                NodeFilter.SHOW_TEXT,
                null,
                false
            );
            
            let node;
            const nodesToUpdate = [];
            
            while (node = walker.nextNode()) {
                if (node.nodeValue.includes(username)) {
                    nodesToUpdate.push(node);
                }
            }
            
            nodesToUpdate.forEach(node => {
                const span = document.createElement('span');
                span.innerHTML = node.nodeValue.replace(
                    new RegExp(`(${username})`, 'g'),
                    `$1 ${flag}`
                );
                node.parentNode.replaceChild(span, node);
            });
            
            // Update the message with the new HTML
            message.innerHTML = tempDiv.innerHTML;
            message.dataset.flagAdded = 'true';
            console.log(`Successfully added flag for ${username}`);
        }
    });
}

// Detect country using ipapi.co
(async function() {
    try {
        console.log('Starting country detection with ipapi.co...');
        
        const response = await fetch('https://ipapi.co/json/');
        if (response.ok) {
            const data = await response.json();
            console.log('ipapi.co response:', data);
            
            if (data && data.country_code) {
                window.userCountryCode = data.country_code.toUpperCase();
                console.log('Country code set (ipapi.co):', window.userCountryCode);
                console.log('Valid country codes:', Array.from(validCountryCodes));
                return;
            }
        }
        
        console.log('Using question mark emoji as fallback');
        window.userCountryCode = null;
    } catch (error) {
        console.error('Error in country detection:', error);
        window.userCountryCode = null;
    }
    
    // Debug: Log DOM structure
    console.log('DOM Content:', document.documentElement.outerHTML);
    
    // Initial check
    console.log('Running initial check...');
    addFlagToMessage();
    
    // Watch for new messages
    const chatContainer = document.getElementById('chat-messages') || 
                         document.querySelector('.chat-messages') ||
                         document.body; // Fallback to body if no container found
    
    console.log('Chat container found:', chatContainer);
    
    if (chatContainer) {
        const observer = new MutationObserver((mutations) => {
            console.log('DOM mutation detected:', mutations);
            addFlagToMessage();
        });
        
        observer.observe(chatContainer, {
            childList: true,
            subtree: true
        });
        
        console.log('MutationObserver set up on container');
    } else {
        console.error('No chat container found in the DOM');
    }
})();
