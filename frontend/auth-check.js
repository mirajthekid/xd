// Authentication verification script
(function() {
    // Global function to check authentication
    window.checkAuth = function() {
        // Check if we're on the chat route
        const isChatRoute = window.location.pathname === '/chat' || 
                          window.location.hash === '#/chat' ||
                          document.getElementById('chat-screen')?.classList.contains('active');
        
        // If we're on the chat route, check verification
        if (isChatRoute) {
            const isVerified = sessionStorage.getItem('userVerified') === 'true';
            
            // If not verified, redirect to home page
            if (!isVerified) {
                // Store the attempted URL for potential redirect after login
                sessionStorage.setItem('redirectAfterLogin', window.location.href);
                window.location.href = '/';
                return false;
            }
            return true;
        }
        
        // If we're on the home page, check for redirect
        const isHomePage = window.location.pathname === '/' || 
                          window.location.pathname.endsWith('index.html') ||
                          document.getElementById('login-screen')?.classList.contains('active');
        
        if (isHomePage) {
            const redirectUrl = sessionStorage.getItem('redirectAfterLogin');
            const isVerified = sessionStorage.getItem('userVerified') === 'true';
            
            // If user is verified and there's a redirect URL, go there
            if (isVerified && redirectUrl) {
                sessionStorage.removeItem('redirectAfterLogin');
                window.location.href = redirectUrl;
                return false;
            }
        }
        return true;
    };

    // Run check on page load
    window.checkAuth();
    
    // Also check when the hash changes (for SPA routing)
    window.addEventListener('hashchange', window.checkAuth);
})();
