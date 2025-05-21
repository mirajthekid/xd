console.log('Country flags script loaded - Emoji Only');

function countryCodeToEmoji(cc) {
    if (!cc || cc.length !== 2) return '🌐';
    try {
        const emoji = String.fromCodePoint(
            0x1F1E6 + cc.toUpperCase().charCodeAt(0) - 65,
            0x1F1E6 + cc.toUpperCase().charCodeAt(1) - 65
        );
        if (/^[A-Z]{2}$/.test(emoji)) return cc.toUpperCase();
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

function insertFlagAfterUsername(message, username) {
    if (message.dataset.flagAdded) return;

    // Find the text node containing the username
    const walker = document.createTreeWalker(message, NodeFilter.SHOW_TEXT, null, false);
    let node;
    let found = false;
    while ((node = walker.nextNode())) {
        const idx = node.nodeValue.indexOf(username);
        if (idx !== -1) {
            // Split the text node at the end of the username
            const afterUsernameIdx = idx + username.length;
            const before = node.nodeValue.slice(0, afterUsernameIdx);
            const after = node.nodeValue.slice(afterUsernameIdx);

            // Create new nodes
            const beforeNode = document.createTextNode(before);
            const afterNode = document.createTextNode(after);

            // Create emoji flag
            const emoji = countryCodeToEmoji(userCountryCode);
            const emojiSpan = document.createElement('span');
            emojiSpan.textContent = emoji;
            emojiSpan.title = `From ${userCountryCode.toUpperCase()}`;
            emojiSpan.className = 'country-flag';
            emojiSpan.style.marginLeft = '5px';
            emojiSpan.style.fontSize = '1.3em';
            emojiSpan.style.verticalAlign = 'middle';

            // Replace the original text node
            node.parentNode.insertBefore(beforeNode, node);
            node.parentNode.insertBefore(emojiSpan, node);
            node.parentNode.insertBefore(afterNode, node);
            node.parentNode.removeChild(node);

            message.dataset.flagAdded = 'true';
            found = true;
            break;
        }
    }
    if (!found) {
        console.warn('Could not find username in message to insert flag:', message);
    }
}

function checkForNewMessages() {
    const messages = document.querySelectorAll('.system-message, .message, [class*="chat-message"]');
    messages.forEach(message => {
        const text = message.textContent || '';
        const match = text.match(/You are now chatting with (\w+)/i);
        if (match && match[1] && !message.dataset.flagAdded) {
            const username = match[1];
            insertFlagAfterUsername(message, username);
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