// Handle country flags for chat partners
let chatPartnerCountryCode = null;

// Map of country codes to flag emojis
const countryFlags = {
    'US': '🇺🇸', 'GB': '🇬🇧', 'DE': '🇩🇪', 'FR': '🇫🇷', 'IT': '🇮🇹', 'ES': '🇪🇸',
    'TR': '🇹🇷', 'RU': '🇷🇺', 'JP': '🇯🇵', 'KR': '🇰🇷', 'CN': '🇨🇳', 'IN': '🇮🇳',
    'BR': '🇧🇷', 'CA': '🇨🇦', 'AU': '🇦🇺', 'NZ': '🇳🇿', 'MX': '🇲🇽', 'AR': '🇦🇷',
    'CL': '🇨🇱', 'CO': '🇨🇴', 'PE': '🇵🇪', 'VE': '🇻🇪', 'ZA': '🇿🇦', 'EG': '🇪🇬',
    'MA': '🇲🇦', 'NG': '🇳🇬', 'KE': '🇰🇪', 'SA': '🇸🇦', 'AE': '🇦🇪', 'IL': '🇮🇱',
    'IR': '🇮🇷', 'PK': '🇵🇰', 'AF': '🇦🇫', 'BD': '🇧🇩', 'TH': '🇹🇭', 'VN': '🇻🇳',
    'ID': '🇮🇩', 'MY': '🇲🇾', 'PH': '🇵🇭', 'SG': '🇸🇬'
};

// Get country flag emoji from country code
function getCountryFlag(countryCode) {
    return countryFlags[countryCode?.toUpperCase()] || '🌍';
}

// Function to update chat partner's country based on IP
async function updatePartnerCountry(ip) {
    try {
        const response = await fetch(`https://ipapi.co/${ip}/json/`);
        const data = await response.json();
        if (data.country_code) {
            chatPartnerCountryCode = data.country_code.toUpperCase();
            return getCountryFlag(chatPartnerCountryCode);
        }
    } catch (error) {
        console.error('Error fetching country:', error);
    }
    return '🌍';
}

// Function to add flag to chat partner's messages
function addFlagToMessage(messageElement) {
    if (!messageElement || !messageElement.classList.contains('incoming')) return;
    
    const senderElement = messageElement.querySelector('.message-sender');
    if (!senderElement) return;

    // Only add flag if it's not already there
    if (!senderElement.textContent.includes('🇦') && !senderElement.textContent.includes('🌍')) {
        const username = senderElement.textContent.replace(':', '').trim();
        const flag = getCountryFlag(chatPartnerCountryCode);
        senderElement.textContent = `${username} ${flag}:`;
    }
}

// Function to process all messages and add flags
function processMessages() {
    const messages = document.querySelectorAll('.message.incoming');
    messages.forEach(addFlagToMessage);
}

// Observe chat messages for new additions
const chatObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1 && node.classList.contains('message')) {
                addFlagToMessage(node);
            }
        });
    });
});

// Start observing chat messages
document.addEventListener('DOMContentLoaded', () => {
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) {
        chatObserver.observe(chatMessages, { childList: true, subtree: true });
    }
});
