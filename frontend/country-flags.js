console.log('Country flags script loaded - Emoji Only');

function countryCodeToEmoji(cc) {
    if (!cc || cc.length !== 2) return '🌐';
    try {
        const emoji = String.fromCodePoint(
            0x1F1E6 + cc.toUpperCase().charCodeAt(0) - 65,
            0x1F1E6 + cc.toUpperCase().charCodeAt(1) - 65
        );
        // Test if emoji renders as a flag or as text
        if (/^[A-Z]{2}$/.test(emoji)) return cc.toUpperCase(); // fallback to country code
        return emoji;
    } catch (e) {
        console.error('Emoji conversion failed:', e);
        return cc.toUpperCase();
    }
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
    if (message.dataset.flagAdded) return;
    const emoji = countryCodeToEmoji(userCountryCode);
    const emojiSpan = document.createElement('span');
    emojiSpan.textContent = emoji;
    emojiSpan.title = `From ${userCountryCode.toUpperCase()}`;
    emojiSpan.className = 'country-flag';
    emojiSpan.style.marginLeft = '5px';
    emojiSpan.style.fontSize = '1.3em';
    emojiSpan.style.verticalAlign = 'middle';
    emojiSpan.style.display = 'inline !important';
    emojiSpan.style.background = 'inherit';
    emojiSpan.style.color = 'inherit';
    console.log(`Appending emoji flag (${emoji}) to:`, message);
    message.appendChild(emojiSpan);
    message.dataset.flagAdded = 'true';
}

function checkForNewMessages() {
    const messages = document.querySelectorAll('.system-message, .message, [class*="chat-message"]');
    messages.forEach(message => {
        const text = message.textContent || '';
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