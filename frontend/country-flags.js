console.log('Country flags script loaded - Emoji Only');

// Convert country code to emoji
function countryCodeToEmoji(cc) {
    if (!cc || cc.length !== 2) return '🌐';
    return String.fromCodePoint(...cc.toUpperCase().split('').map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
}

let userCountryCode = 'us';

async function detectCountryAndStart() {
    try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        userCountryCode = data.country_code ? data.country_code.toLowerCase() : 'us';
        console.log('Country code set to:', userCountryCode);
    } catch (e) {
        console.error('Failed to detect country, defaulting to US:', e);
        userCountryCode = 'us';
    }
    startFlagInsertion();
}

function addFlagToSystemMessage(message, username) {
    // Only add one flag per message
    if (message.dataset.flagAdded) return;
    const emoji = countryCodeToEmoji(userCountryCode);
    const emojiSpan = document.createElement('span');
    emojiSpan.textContent = emoji;
    emojiSpan.title = `From ${userCountryCode.toUpperCase()}`;
    emojiSpan.className = 'country-flag';
    emojiSpan.style.marginLeft = '5px';
    emojiSpan.style.fontSize = '1.3em';
    emojiSpan.style.verticalAlign = 'middle';

    // Append the emoji flag to the message
    message.appendChild(emojiSpan);
    message.dataset.flagAdded = 'true';
    console.log(`Emoji flag (${emoji}) added to message:`, message);
}

function checkForNewMessages() {
    const messages = document.querySelectorAll('.system-message, .message, [class*="chat-message"]');
    messages.forEach(message => {
        const text = message.textContent || '';
        // FIX: Use correct regex!
        const match = text.match(/You are now chatting with (\w+)/i);
        if (match && match[1] && !message.dataset.flagAdded) {
            const username = match[1];
            addFlagToSystemMessage(message, username);
        }
    });
}

function startFlagInsertion() {
    checkForNewMessages();
    const observer = new MutationObserver(() => checkForNewMessages());
    const chatContainer = document.getElementById('chat-messages') || document.body;
    observer.observe(chatContainer, { childList: true, subtree: true });
    setInterval(checkForNewMessages, 3000);
}

detectCountryAndStart();