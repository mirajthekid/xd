/**
 * Mobile-specific adjustments
 * - Removes [ESC] from skip button on mobile
 * - Adds swipe instruction for mobile users
 */

// Function to get flag emoji from country code
function getFlagEmoji(countryCode) {
    // Convert country code to flag emoji
    const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map(char => 127397 + char.charCodeAt())
        .map(code => String.fromCodePoint(code));
    return codePoints.join('');
}

document.addEventListener('DOMContentLoaded', function() {
    // Check if the device is mobile
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
        // Remove [ESC] from skip button on mobile
        const skipBtn = document.getElementById('skip-btn');
        if (skipBtn) {
            skipBtn.textContent = 'SKIP';
        }
        
        // Remove the static swipe instruction div since we'll add it dynamically
        const staticSwipeInstruction = document.querySelector('.swipe-instruction');
        if (staticSwipeInstruction) {
            staticSwipeInstruction.remove();
        }
        
        // Modify the 'You are now chatting with' message on mobile
        const chatMessages = document.getElementById('chat-messages');
        
        // Set up a mutation observer to detect when new messages are added
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    for (let i = 0; i < mutation.addedNodes.length; i++) {
                        const node = mutation.addedNodes[i];
                        if (node.classList && 
                            node.classList.contains('message') && 
                            node.classList.contains('system') && 
                            node.textContent.includes('You are now chatting with')) {
                            
                            // Modify the message to include flag and swipe instruction
                            const originalText = node.textContent;
                            const flagEmoji = getFlagEmoji(window.userCountryCode || 'US');
                            node.textContent = `${originalText} ${flagEmoji} Swipe left to skip`;
                            break;
                        }
                    }
                }
            });
        });
        
        // Start observing the chat messages container
        if (chatMessages) {
            observer.observe(chatMessages, { childList: true });
            
            // Also check existing messages (in case we loaded after they were added)
            const existingMessages = chatMessages.querySelectorAll('.message.system');
            existingMessages.forEach(msg => {
                if (msg.textContent.includes('You are now chatting with') && 
                    !msg.textContent.includes('Swipe left to skip')) {
                    const flagEmoji = getFlagEmoji(window.userCountryCode || 'US');
                    msg.textContent = `${msg.textContent} ${flagEmoji} Swipe left to skip`;
                }
            });
        }
    }
});
