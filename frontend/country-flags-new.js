// country-flags.js - Optimized Implementation with all country flags
console.log('Country flags script loaded');

// Tüm ülke kodları ve bayrak emojileri
const countryFlags = {
    'AD': '🇦🇩', 'AE': '🇦🇪', 'AF': '🇦🇫', 'AG': '🇦🇬', 'AI': '🇦🇮', 'AL': '🇦🇱', 'AM': '🇦🇲', 'AO': '🇦🇴', 'AQ': '🇦🇶', 'AR': '🇦🇷',
    'AS': '🇦🇸', 'AT': '🇦🇹', 'AU': '🇦🇺', 'AW': '🇦🇼', 'AX': '🇦🇽', 'AZ': '🇦🇿', 'BA': '🇧🇦', 'BB': '🇧🇧', 'BD': '🇧🇩', 'BE': '🇧🇪',
    'BF': '🇧🇫', 'BG': '🇧🇬', 'BH': '🇧🇭', 'BI': '🇧🇮', 'BJ': '🇧🇯', 'BL': '🇧🇱', 'BM': '🇧🇲', 'BN': '🇧🇳', 'BO': '🇧🇴', 'BQ': '🇧🇶',
    'BR': '🇧🇷', 'BS': '🇧🇸', 'BT': '🇧🇹', 'BV': '🇧🇻', 'BW': '🇧🇼', 'BY': '🇧🇾', 'BZ': '🇧🇿', 'CA': '🇨🇦', 'CC': '🇨🇨', 'CD': '🇨🇩',
    'CF': '🇨🇫', 'CG': '🇨🇬', 'CH': '🇨🇭', 'CI': '🇨🇮', 'CK': '🇨🇰', 'CL': '🇨🇱', 'CM': '🇨🇲', 'CN': '🇨🇳', 'CO': '🇨🇴', 'CR': '🇨🇷',
    'CU': '🇨🇺', 'CV': '🇨🇻', 'CW': '🇨🇼', 'CX': '🇨🇽', 'CY': '🇨🇾', 'CZ': '🇨🇿', 'DE': '🇩🇪', 'DJ': '🇩🇯', 'DK': '🇩🇰', 'DM': '🇩🇲',
    'DO': '🇩🇴', 'DZ': '🇩🇿', 'EC': '🇪🇨', 'EE': '🇪🇪', 'EG': '🇪🇬', 'EH': '🇪🇭', 'ER': '🇪🇷', 'ES': '🇪🇸', 'ET': '🇪🇹', 'FI': '🇫🇮',
    'FJ': '🇫🇯', 'FK': '🇫🇰', 'FM': '🇫🇲', 'FO': '🇫🇴', 'FR': '🇫🇷', 'GA': '🇬🇦', 'GB': '🇬🇧', 'GD': '🇬🇩', 'GE': '🇬🇪', 'GF': '🇬🇫',
    'GG': '🇬🇬', 'GH': '🇬🇭', 'GI': '🇬🇮', 'GL': '🇬🇱', 'GM': '🇬🇲', 'GN': '🇬🇳', 'GP': '🇬🇵', 'GQ': '🇬🇶', 'GR': '🇬🇷', 'GS': '🇬🇸',
    'GT': '🇬🇹', 'GU': '🇬🇺', 'GW': '🇬🇼', 'GY': '🇬🇾', 'HK': '🇭🇰', 'HM': '🇭🇲', 'HN': '🇭🇳', 'HR': '🇭🇷', 'HT': '🇭🇹', 'HU': '🇭🇺',
    'ID': '🇮🇩', 'IE': '🇮🇪', 'IL': '🇮🇱', 'IM': '🇮🇲', 'IN': '🇮🇳', 'IO': '🇮🇴', 'IQ': '🇮🇶', 'IR': '🇮🇷', 'IS': '🇮🇸', 'IT': '🇮🇹',
    'JE': '🇯🇪', 'JM': '🇯🇲', 'JO': '🇯🇴', 'JP': '🇯🇵', 'KE': '🇰🇪', 'KG': '🇰🇬', 'KH': '🇰🇭', 'KI': '🇰🇮', 'KM': '🇰🇲', 'KN': '🇰🇳',
    'KP': '🇰🇵', 'KR': '🇰🇷', 'KW': '🇰🇼', 'KY': '🇰🇾', 'KZ': '🇰🇿', 'LA': '🇱🇦', 'LB': '🇱🇧', 'LC': '🇱🇨', 'LI': '🇱🇮', 'LK': '🇱🇰',
    'LR': '🇱🇷', 'LS': '🇱🇸', 'LT': '🇱🇹', 'LU': '🇱🇺', 'LV': '🇱🇻', 'LY': '🇱🇾', 'MA': '🇲🇦', 'MC': '🇲🇨', 'MD': '🇲🇩', 'ME': '🇲🇪',
    'MF': '🇲🇫', 'MG': '🇲🇬', 'MH': '🇲🇭', 'MK': '🇲🇰', 'ML': '🇲🇱', 'MM': '🇲🇲', 'MN': '🇲🇳', 'MO': '🇲🇴', 'MP': '🇲🇵', 'MQ': '🇲🇶',
    'MR': '🇲🇷', 'MS': '🇲🇸', 'MT': '🇲🇹', 'MU': '🇲🇺', 'MV': '🇲🇻', 'MW': '🇲🇼', 'MX': '🇲🇽', 'MY': '🇲🇾', 'MZ': '🇲🇿', 'NA': '🇳🇦',
    'NC': '🇳🇨', 'NE': '🇳🇪', 'NF': '🇳🇫', 'NG': '🇳🇬', 'NI': '🇳🇮', 'NL': '🇳🇱', 'NO': '🇳🇴', 'NP': '🇳🇵', 'NR': '🇳🇷', 'NU': '🇳🇺',
    'NZ': '🇳🇿', 'OM': '🇴🇲', 'PA': '🇵🇦', 'PE': '🇵🇪', 'PF': '🇵🇫', 'PG': '🇵🇬', 'PH': '🇵🇭', 'PK': '🇵🇰', 'PL': '🇵🇱', 'PM': '🇵🇲',
    'PN': '🇵🇳', 'PR': '🇵🇷', 'PS': '🇵🇸', 'PT': '🇵🇹', 'PW': '🇵🇼', 'PY': '🇵🇾', 'QA': '🇶🇦', 'RE': '🇷🇪', 'RO': '🇷🇴', 'RS': '🇷🇸',
    'RU': '🇷🇺', 'RW': '🇷🇼', 'SA': '🇸🇦', 'SB': '🇸🇧', 'SC': '🇸🇨', 'SD': '🇸🇩', 'SE': '🇸🇪', 'SG': '🇸🇬', 'SH': '🇸🇭', 'SI': '🇸🇮',
    'SJ': '🇸🇯', 'SK': '🇸🇰', 'SL': '🇸🇱', 'SM': '🇸🇲', 'SN': '🇸🇳', 'SO': '🇸🇴', 'SR': '🇸🇷', 'SS': '🇸🇸', 'ST': '🇸🇹', 'SV': '🇸🇻',
    'SX': '🇸🇽', 'SY': '🇸🇾', 'SZ': '🇸🇿', 'TC': '🇹🇨', 'TD': '🇹🇩', 'TF': '🇹🇫', 'TG': '🇹🇬', 'TH': '🇹🇭', 'TJ': '🇹🇯', 'TK': '🇹🇰',
    'TL': '🇹🇱', 'TM': '🇹🇲', 'TN': '🇹🇳', 'TO': '🇹🇴', 'TR': '🇹🇷', 'TT': '🇹🇹', 'TV': '🇹🇻', 'TW': '🇹🇼', 'TZ': '🇹🇿', 'UA': '🇺🇦',
    'UG': '🇺🇬', 'UM': '🇺🇲', 'US': '🇺🇸', 'UY': '🇺🇾', 'UZ': '🇺🇿', 'VA': '🇻🇦', 'VC': '🇻🇨', 'VE': '🇻🇪', 'VG': '🇻🇬', 'VI': '🇻🇮',
    'VN': '🇻🇳', 'VU': '🇻🇺', 'WF': '🇼🇫', 'WS': '🇼🇸', 'XK': '🇽🇰', 'YE': '🇾🇪', 'YT': '🇾🇹', 'ZA': '🇿🇦', 'ZM': '🇿🇲', 'ZW': '🇿🇼'
};

// Kullanıcı ülke kodu
window.userCountryCode = 'US'; // Varsayılan değer
window.otherUserCountryCode = 'TR'; // Varsayılan diğer kullanıcı kodu

// Kullanıcı adından ülke kodu çıkarma (örnek: "John_US" -> "US")
function getCountryCodeFromUsername(username) {
    if (!username) return null;
    const match = username.match(/_(\w{2})$/i);
    if (match && match[1]) {
        const code = match[1].toUpperCase();
        return countryFlags[code] ? code : null;
    }
    return null;
}

// Start country detection in the background
fetch('https://ipapi.co/json/')
    .then(response => response.json())
    .then(data => {
        if (data?.country_code) {
            window.userCountryCode = data.country_code;
            console.log('Detected country:', window.userCountryCode);
            // Update any existing messages with the new flag
            processChatMessages();
        }
    })
    .catch(error => {
        console.error('Error detecting country:', error);
    });

/**
 * Converts a country code to a flag emoji
 * @param {string} countryCode - ISO 3166-1 alpha-2 country code
 * @returns {string} Flag emoji or 🌍 if invalid
 */
function getFlagEmoji(countryCode) {
    if (!countryCode) return '🌍';
    
    const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map(char => 127397 + char.charCodeAt(0))
        .map(code => String.fromCodePoint(code));
    
    return codePoints.join('');
}

/**
 * Adds a flag emoji to a username element
 * @param {HTMLElement} usernameElement - The element containing the username
 * @param {string} flag - The flag emoji to add
 */
function addFlagToUsername(usernameElement, flag) {
    if (!usernameElement || !flag) return;
    
    // Only add flag if not already present
    if (!usernameElement.textContent.includes(flag)) {
        usernameElement.textContent = `${usernameElement.textContent.trim()} ${flag}`;
    }
}

/**
 * Processes all chat messages to add country flags
 */
function processChatMessages() {
    // Sadece işlenmemiş mesajları al
    const messages = document.querySelectorAll('.message:not([data-flag-processed])');
    
    messages.forEach(message => {
        // İşaretle
        message.dataset.flagProcessed = 'true';
        
        // Sistem mesajlarını atla (bayrak eklemeye gerek yok)
        if (message.classList.contains('system')) {
            return;
        }
        
        // Mesaj gönderen elementini bul
        const senderElement = message.querySelector('.message-sender');
        if (!senderElement) return;
        
        // Kullanıcı adını al (varsa)
        const username = senderElement.textContent.replace(':', '').trim();
        
        // Gelen mesajlarda (karşı tarafın mesajları)
        if (message.classList.contains('incoming')) {
            // Kullanıcı adından ülke kodunu çıkar
            const countryCode = getCountryCodeFromUsername(username) || window.otherUserCountryCode;
            const flag = countryFlags[countryCode] || '🌍'; // Varsayılan bayrak
            addFlagToUsername(senderElement, flag);
        } 
        // Giden mesajlarda (kendi mesajlarımız)
        else if (message.classList.contains('outgoing')) {
            // Kendi bayrağımızı ekle
            const flag = countryFlags[window.userCountryCode] || '🌍';
            addFlagToUsername(senderElement, flag);
        }
    });
}

/**
 * Initializes the country flag system
 */
function initCountryFlags() {
    console.log('Initializing country flags...');
    
    // Initial processing of messages
    processChatMessages();
    
    // Set up mutation observer to handle new messages
    const chatContainer = document.getElementById('chat-messages');
    if (chatContainer) {
        const observer = new MutationObserver(() => {
            processChatMessages();
        });
        
        observer.observe(chatContainer, {
            childList: true,
            subtree: true
        });
    }
}

// Start when the DOM is fully loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCountryFlags);
} else {
    initCountryFlags();
}
