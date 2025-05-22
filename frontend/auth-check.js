// Authentication verification script
(function() {
    // Only run on the client side
    if (typeof window === 'undefined') return;
    
    // Check if we're on a chat route
    const isChatRoute = window.location.pathname.includes('/chat') || 
                       window.location.hash.includes('chat');
    
    // If we're on a chat route and not verified, redirect to home
    if (isChatRoute) {
        const isVerified = sessionStorage.getItem('userVerified') === 'true';
        if (!isVerified) {
            // Store the original URL for after login
            const originalUrl = window.location.href;
            if (originalUrl !== window.location.origin + '/') {
                sessionStorage.setItem('redirectAfterLogin', originalUrl);
            }
            // Only redirect if we're not already on the home page
            if (window.location.pathname !== '/') {
                window.location.href = '/';
                return;
            }
        }
    }

    // Function to check if we're on the chat route
    function isChatRoute() {
        return window.location.pathname.includes('/chat') || 
               window.location.hash.includes('chat') ||
               (document.getElementById('chat-screen')?.classList.contains('active') === true) ||
               document.querySelector('.chat-container') !== null;
    }

    // Function to check if we're on the home/login route
    function isHomeRoute() {
        return window.location.pathname === '/' || 
               window.location.pathname.endsWith('index.html') ||
               (document.getElementById('login-screen')?.classList.contains('active') === true) ||
               document.getElementById('login-screen') !== null;
    }

    // Function to handle redirection
    function handleUnauthenticatedAccess() {
        // Clear any existing verification to prevent race conditions
        sessionStorage.removeItem('userVerified');
        // Store the attempted URL for potential redirect after login
        sessionStorage.setItem('redirectAfterLogin', window.location.href);
        // Force a hard redirect to root with a parameter to prevent loops
        const redirectUrl = new URL(window.location.origin);
        redirectUrl.searchParams.set('redirected', 'true');
        window.location.href = redirectUrl.toString();
    }

    // Global function to check authentication
    window.checkAuth = function() {
        const isVerified = sessionStorage.getItem('userVerified') === 'true';
        const isChat = isChatRoute();
        
        // If on chat route but not verified
        if (isChat && !isVerified) {
            const originalUrl = window.location.href;
            if (originalUrl !== window.location.origin + '/') {
                sessionStorage.setItem('redirectAfterLogin', originalUrl);
            }
            if (window.location.pathname !== '/') {
                window.location.href = '/';
            }
            return false;
        }
        
        // If verified and has a stored redirect URL
        if (isVerified) {
            const redirectUrl = sessionStorage.getItem('redirectAfterLogin');
            if (redirectUrl) {
                try {
                    const targetUrl = new URL(redirectUrl);
                    const currentUrl = new URL(window.location.href);
                    
                    // Only redirect if not already on the target URL
                    if (targetUrl.pathname !== currentUrl.pathname || 
                        targetUrl.hash !== currentUrl.hash) {
                        sessionStorage.removeItem('redirectAfterLogin');
                        window.location.href = redirectUrl;
                        return false;
                    }
                } catch (e) {
                    console.error('Invalid redirect URL:', e);
                    sessionStorage.removeItem('redirectAfterLogin');
                }
            }
        }
        
        return true;
    };

    // Run check immediately when script loads
    if (isChatRoute() && sessionStorage.getItem('userVerified') !== 'true') {
        handleUnauthenticatedAccess();
    }
    
    // Also run check when DOM is fully loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', window.checkAuth);
    } else {
        window.checkAuth();
    }
    
    // Also check when the hash changes (for SPA routing)
    window.addEventListener('hashchange', window.checkAuth);
    
    // Additional check for SPA navigation
    const originalPushState = history.pushState;
    history.pushState = function() {
        originalPushState.apply(this, arguments);
        window.dispatchEvent(new Event('locationchange'));
    };
    
    window.addEventListener('popstate', function() {
        window.dispatchEvent(new Event('locationchange'));
    });
    
    window.addEventListener('locationchange', function() {
        if (isChatRoute() && sessionStorage.getItem('userVerified') !== 'true') {
            handleUnauthenticatedAccess();
        }
    });
})();
