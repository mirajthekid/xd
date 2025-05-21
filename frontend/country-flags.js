// country-flags.js - Emoji Only, Robust, Synchronous

console.log('Country flags script loaded - Emoji Only');

// Convert country code to emoji
function countryCodeToEmoji(cc) {
    if (!cc || cc.length !== 2) return '🌐';
    return String.fromCodePoint(...cc.toUpperCase().split('').map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
}

// Global variable to store country code
let userCountryCode = 'us';

// Detect country ONCE at page load, then start flag insertion logic
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

function addFlagToUsername(username) {
    // Only add one flag per username/message
    if (!window.__flagAddedFor) window.__flagAddedFor = {};
    if (window.__flagAddedFor[username]) return;
    window.__flagAddedFor[username] = true;

    const emoji = countryCodeToEmoji(userCountryCode);
    const emojiSpan = document.createElement('span');
    emojiSpan.textContent = emoji;
    emojiSpan.title = `From ${userCountryCode.toUpperCase()}`;
    emojiSpan.className = 'country-flag';
    emojiSpan.style.marginLeft = '5px';
    emojiSpan.style.fontSize = '1.3em';
    emojiSpan.style.verticalAlign = 'middle';

    // Try to find username as a span or strong or b element
    let found = false;
    const selectors = [
        `span.username`, `strong`, `b`, `span`, `div`, `p`
    ];
    selectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => {
            if (el.textContent.trim() === username && !el.dataset.flagAdded) {
                el.insertAdjacentElement('afterend', emojiSpan.cloneNode(true));
                el.dataset.flagAdded = 'true';
                found = true;
            }
        });
    });

    // Fallback: try to match username in system messages
    if (!found) {
        const systemMessages = document.querySelectorAll('.system-message, .message, [class*="chat-message"]');
        systemMessages.forEach(msg => {
            if (msg.textContent.includes(username) && !msg.dataset.flagAdded) {
                msg.appendChild(emojiSpan.cloneNode(true));
                msg.dataset.flagAdded = 'true';
                found = true;
            }
        });
    }

    if (!found) {
        console.warn('Could not find username element to add flag:', username);
    }
}

function checkForNewMessages() {
    const messages = document.querySelectorAll('.system-message, .message, [class*="chat-message"]');
    messages.forEach(message => {
        const text = message.textContent || '';
        const match = text.match(/You are now chatting with (\\w+)/i);
        if (match && match[1] && !message.dataset.flagChecked) {
            const username = match[1];
            addFlagToUsername(username);
            message.dataset.flagChecked = 'true';
        }
    });
}

function startFlagInsertion() {
    // Initial check
    checkForNewMessages();
    // Observe for new messages
    const observer = new MutationObserver(() => checkForNewMessages());
    const chatContainer = document.getElementById('chat-messages') || document.body;
    observer.observe(chatContainer, { childList: true, subtree: true });
    // Periodic fallback
    setInterval(checkForNewMessages, 3000);
}

detectCountryAndStart();