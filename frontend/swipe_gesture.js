/**
 * Swipe gesture handler for mobile devices
 * Allows users to swipe left on chat window to skip
 */
(function() {
    'use strict';
    
    // Wait for DOM to be fully loaded
    if (document.readyState === 'complete') {
        initSwipeHandler();
    } else {
        window.addEventListener('load', initSwipeHandler);
    }
    
    function initSwipeHandler() {
        console.log('Initializing swipe gesture handler');
        
        // Get the chat messages container
        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages) {
            console.error('Chat messages container not found');
            return;
        }
        
        // Variables to track touch events
        let touchStartX = 0;
        let touchEndX = 0;
        const minSwipeDistance = 100; // Minimum distance required for a swipe (in pixels)
        
        // Add touch event listeners
        chatMessages.addEventListener('touchstart', handleTouchStart, false);
        chatMessages.addEventListener('touchend', handleTouchEnd, false);
        
        // Handle touch start event
        function handleTouchStart(event) {
            touchStartX = event.touches[0].clientX;
        }
        
        // Handle touch end event
        function handleTouchEnd(event) {
            touchEndX = event.changedTouches[0].clientX;
            handleSwipe();
        }
        
        // Process the swipe
        function handleSwipe() {
            // Calculate swipe distance
            const swipeDistance = touchStartX - touchEndX;
            
            // Check if it's a left swipe with sufficient distance
            if (swipeDistance > minSwipeDistance) {
                console.log('Left swipe detected, initiating skip');
                
                // Trigger skip function if it exists
                if (typeof initiateSkip === 'function') {
                    initiateSkip();
                } else if (typeof window.initiateSkip === 'function') {
                    window.initiateSkip();
                } else {
                    // Fallback: try to click the skip button
                    const skipBtn = document.getElementById('skip-btn');
                    if (skipBtn) {
                        skipBtn.click();
                    } else {
                        console.error('Skip function not found');
                    }
                }
            }
        }
        
        console.log('Swipe gesture handler initialized');
    }
})();
