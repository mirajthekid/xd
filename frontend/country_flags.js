// Simple country flag emoji for typeshi.fun
(function() {
    console.log('Country flags feature loaded');
    
    // Simple mapping of country codes to flag emojis
    const flagEmojis = {
        'us': '🇺🇸', 'gb': '🇬🇧', 'ca': '🇨🇦', 'au': '🇦🇺', 'de': '🇩🇪',
        'fr': '🇫🇷', 'it': '🇮🇹', 'es': '🇪🇸', 'jp': '🇯🇵', 'kr': '🇰🇷',
        'cn': '🇨🇳', 'in': '🇮🇳', 'br': '🇧🇷', 'ru': '🇷🇺', 'tr': '🇹🇷',
        // Add more country codes as needed
    };

    // Function to get flag emoji from country code
    function getFlagEmoji(countryCode) {
        if (!countryCode) return '🌐';
        return flagEmojis[countryCode.toLowerCase()] || '🌐';
    }

    // Wait for DOM to be fully loaded
    if (document.readyState === 'complete') {
        addFlags();
    } else {
        window.addEventListener('load', addFlags);
    }

    function addFlags() {
        console.log('Adding country flags...');
        
        // Add CSS for flag display
        const style = document.createElement('style');
        style.textContent = `
            .country-flag {
                display: inline-block;
                margin-left: 5px;
                font-size: 14px;
                line-height: 1;
            }
        `;
        document.head.appendChild(style);

        // Function to add flag to a message
        function addFlagToMessage(message) {
            try {
                const text = message.textContent || '';
                if (!text.includes('You are now chatting with')) return;
                
                console.log('Found chat message:', text);
                
                // Skip if already processed
                if (message.querySelector('.country-flag')) {
                    console.log('Message already has a flag, skipping');
                    return;
                }
                
                // Extract username
                const match = text.match(/You are now chatting with (\w+)/);
                if (!match || !match[1]) {
                    console.log('Could not extract username from:', text);
                    return;
                }
                
                const username = match[1];
                console.log('Found username:', username);
                
                // Get country code (default to 'us' for now)
                const countryCode = 'us'; // In a real app, get this from the server
                const flag = getFlagEmoji(countryCode);
                
                console.log(`Adding flag ${flag} for country ${countryCode}`);
                
                // Create flag element
                const flagSpan = document.createElement('span');
                flagSpan.className = 'country-flag';
                flagSpan.textContent = flag;
                flagSpan.title = countryCode.toUpperCase();
                
                // Replace the username with username + flag
                message.innerHTML = text.replace(
                    new RegExp(`(${username})`), 
                    `$1${flagSpan.outerHTML}`
                );
                
                console.log('Updated message HTML:', message.innerHTML);
                
            } catch (error) {
                console.error('Error adding flag to message:', error);
            }
        }

        // Process existing chat messages
        function processExistingMessages() {
            console.log('Processing existing messages...');
            const messages = document.querySelectorAll('.message.system');
            console.log(`Found ${messages.length} system messages`);
            messages.forEach(addFlagToMessage);
        }

        // Watch for new messages
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.addedNodes) {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1 && 
                            node.classList && 
                            node.classList.contains('message') && 
                            node.classList.contains('system')) {
                            addFlagToMessage(node);
                        }
                    });
                }
            });
        });

        // Start observing
        const chatContainer = document.querySelector('.chat-messages');
        if (chatContainer) {
            console.log('Setting up mutation observer on chat container');
            observer.observe(chatContainer, { childList: true, subtree: true });
            
            // Process existing messages
            processExistingMessages();
            
            // Also check periodically
            const checkInterval = setInterval(() => {
                if (!document.body.contains(chatContainer)) {
                    clearInterval(checkInterval);
                    return;
                }
                processExistingMessages();
            }, 2000);
        } else {
            console.error('Could not find chat messages container');
        }
    }
})();
