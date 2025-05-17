// Global variables
let socket;
let userId;
let username;
let partnerUsername = null;
let roomId = null;
let skipCountdownTimer = null;
let typingTimer = null;
let isTyping = false;
let reconnectAttempts = 0;
let maxReconnectAttempts = 3;
let reconnectBackoff = 2000; // Start with 2 seconds

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const waitingScreen = document.getElementById('waiting-screen');
const chatScreen = document.getElementById('chat-screen');
const skipOverlay = document.getElementById('skip-overlay');

const usernameInput = document.getElementById('username-input');
const loginStatus = document.getElementById('login-status');

const waitingStatus = document.getElementById('waiting-status');
const cancelSearchBtn = document.getElementById('cancel-search-btn');

const partnerUsernameElement = document.getElementById('partner-username');
const chatMessages = document.getElementById('chat-messages');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const typingIndicator = document.getElementById('typing-indicator');
const skipBtn = document.getElementById('skip-btn');
const reportBtn = document.getElementById('report-btn');
const skipCountdown = document.getElementById('skip-countdown');

// WebSocket server URL - dynamically determine protocol and port
const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const port = window.location.port ? `:${window.location.port}` : '';
const WS_URL = `${protocol}//${window.location.hostname}${port}`;

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    // Focus username input on page load
    usernameInput.focus();
    
    // Event listeners
    usernameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });
    
    cancelSearchBtn.addEventListener('click', handleCancelSearch);
    
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
    
    // Allow typing anywhere on the screen
    document.addEventListener('click', (e) => {
        if (chatScreen.style.display === 'flex') {
            messageInput.focus();
        }
    });
    
    // Auto-focus input when entering chat
    const autoFocusInput = () => {
        if (chatScreen.style.display === 'flex') {
            messageInput.focus();
        }
    };
    
    // Typing indicator
    messageInput.addEventListener('input', handleTypingEvent);
    
    // Skip functionality
    skipBtn.addEventListener('click', initiateSkip);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (skipOverlay.classList.contains('active')) {
                cancelSkip();
            } else if (chatScreen.classList.contains('active')) {
                initiateSkip();
            }
        }
    });
    
    // Report functionality
    reportBtn.addEventListener('click', reportUser);
});

// Glitch text effect function
function glitchText(text) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    const hackingChars = '01░▒▓█▄▀■□▪▫▬▲►▼◄◊○●◘◙◦☺☻☼♀♂♠♣♥♦♪♫';
    const glitchDuration = 800; // ms
    const glitchSteps = 15;
    const stepDuration = glitchDuration / glitchSteps;
    
    let currentStep = 0;
    const originalText = text;
    const textLength = text.length;
    
    // Create a span to hold the glitching text
    const glitchSpan = document.createElement('span');
    glitchSpan.classList.add('glitch-text');
    
    // Set data-text attribute for CSS pseudo-elements
    glitchSpan.setAttribute('data-text', text);
    
    // Initial content
    glitchSpan.textContent = text.replace(/[a-zA-Z0-9]/g, () => hackingChars.charAt(Math.floor(Math.random() * hackingChars.length)));
    
    const glitchInterval = setInterval(() => {
        currentStep++;
        
        if (currentStep >= glitchSteps) {
            // End glitch effect
            glitchSpan.textContent = originalText;
            clearInterval(glitchInterval);
        } else {
            // Create glitched text
            let glitchedText = '';
            for (let i = 0; i < textLength; i++) {
                // Gradually reveal more of the original text as we progress
                if (i < (textLength * (currentStep / glitchSteps))) {
                    // Revealed characters occasionally glitch
                    if (Math.random() < 0.05) {
                        glitchedText += hackingChars.charAt(Math.floor(Math.random() * hackingChars.length));
                    } else {
                        glitchedText += originalText[i];
                    }
                } else if (Math.random() < 0.7) {
                    // Hacking-style characters (more common)
                    glitchedText += hackingChars.charAt(Math.floor(Math.random() * hackingChars.length));
                } else {
                    // Regular random characters (less common)
                    glitchedText += characters.charAt(Math.floor(Math.random() * characters.length));
                }
            }
            glitchSpan.textContent = glitchedText;
        }
    }, stepDuration);
    
    return glitchSpan;
}

// Connect to WebSocket server with reconnection logic
function connectToServer() {
    try {
        console.log(`Attempting to connect to WebSocket server at: ${WS_URL}`);
        console.log(`Current protocol: ${window.location.protocol}, hostname: ${window.location.hostname}, port: ${window.location.port}`);
        
        // Create WebSocket connection
        socket = new WebSocket(WS_URL);
        console.log('WebSocket object created:', socket);
        
        // Connection opened
        socket.addEventListener('open', (event) => {
            console.log('Connected to server successfully');
            console.log('WebSocket open event:', event);
            // Reset reconnection attempts on successful connection
            reconnectAttempts = 0;
            reconnectBackoff = 2000; // Reset backoff time
            
            // Send login request only if we have a username and are connecting for login purposes
            if (username && loginStatus.textContent === 'Connecting to server...') {
                console.log(`Sending login request for username: ${username}`);
                sendLoginRequest();
            } else {
                console.log(`Not sending login request. Username: ${username}, Status: ${loginStatus.textContent}`);
            }
        });
        
        // Listen for messages
        socket.addEventListener('message', handleSocketMessage);
        
        // Connection closed
        socket.addEventListener('close', (event) => {
            console.log(`WebSocket connection closed. Code: ${event.code}, Reason: ${event.reason}`);
            
            // Attempt to reconnect if not at max attempts
            if (reconnectAttempts < maxReconnectAttempts) {
                reconnectAttempts++;
                const timeout = reconnectBackoff * Math.pow(2, reconnectAttempts - 1); // Exponential backoff
                console.log(`Attempting to reconnect (${reconnectAttempts}/${maxReconnectAttempts}) in ${timeout}ms...`);
                
                loginStatus.textContent = `Connection lost. Reconnecting (${reconnectAttempts}/${maxReconnectAttempts})...`;
                loginStatus.style.color = 'var(--notification-color)';
                
                setTimeout(() => {
                    connectToServer();
                }, timeout);
            } else {
                // Max reconnection attempts reached
                console.log('Maximum reconnection attempts reached. Giving up.');
                
                // Show login screen with error message
                showScreen(loginScreen);
                loginStatus.textContent = 'Connection lost. Please refresh the page and try again.';
                loginStatus.style.color = 'var(--error-color)';
                
                // Clear any existing data
                userId = null;
                roomId = null;
                partnerUsername = null;
            }
        });
        
        // Connection error
        socket.addEventListener('error', (event) => {
            console.error('WebSocket error:', event);
            // Error handling is done in the close event handler
        });
    } catch (error) {
        console.error('Error connecting to server:', error);
        loginStatus.textContent = 'Could not connect to server. Please try again later.';
        loginStatus.style.color = 'var(--error-color)';
    }
}

// Handle login
function handleLogin() {
    // Get and validate username
    username = usernameInput.value.trim();
    console.log(`Login attempt with username: ${username}`);
    
    if (!username) {
        loginStatus.textContent = 'Please enter a username';
        loginStatus.style.color = 'var(--error-color)';
        return;
    }
    
    if (username.length < 3) {
        loginStatus.textContent = 'Username must be at least 3 characters';
        loginStatus.style.color = 'var(--error-color)';
        return;
    }
    
    // Update UI to show we're connecting
    loginStatus.textContent = 'Connecting to server...';
    loginStatus.style.color = 'var(--notification-color)';
    console.log(`WebSocket URL: ${WS_URL}`);
    
    // Close any existing connection
    if (socket) {
        console.log('Closing existing socket connection');
        socket.close();
    }
    
    // Connect to server
    console.log('Attempting to connect to WebSocket server...');
    connectToServer();
    
    // Set a timeout in case connection fails
    setTimeout(() => {
        console.log(`Connection status check - Socket exists: ${!!socket}, ReadyState: ${socket ? socket.readyState : 'N/A'}`);
        if (!socket || socket.readyState !== WebSocket.OPEN) {
            loginStatus.textContent = 'Failed to connect to server. Please try again.';
            loginStatus.style.color = 'var(--error-color)';
            console.error('WebSocket connection failed or timed out');
        } else {
            console.log('WebSocket connection established successfully');
        }
    }, 5000);
}

// Send login request to server
function sendLoginRequest() {
    console.log(`Preparing to send login request for username: ${username}`);
    try {
        const loginData = {
            type: 'login',
            username: username
        };
        const loginJSON = JSON.stringify(loginData);
        console.log(`Sending login data: ${loginJSON}`);
        socket.send(loginJSON);
        console.log('Login request sent successfully');
    } catch (error) {
        console.error('Error sending login request:', error);
        loginStatus.textContent = 'Error sending login request. Please try again.';
        loginStatus.style.color = 'var(--error-color)';
    }
    
    // Show waiting screen
    showScreen(waitingScreen);
    updateWaitingStatus('Establishing secure connection...');
    
    // Set up waiting messages with periodic updates
    const waitingMessages = [
        'Searching for available users...',
        'Waiting for someone to connect...',
        'Looking for a chat partner...',
        'Waiting for another user to join...',
        'Pairing users in order (1st with 2nd, 3rd with 4th)...',
        'Still waiting for a match...',
        'You are in the queue. Will be matched when another user joins...',
        'Secure connection established. Waiting for a partner...',
        'Patience is a virtue. Waiting for your match...',
        'You will be paired with the next person who joins...'
    ];
    
    let messageIndex = 0;
    const waitingInterval = setInterval(() => {
        if (!waitingScreen.classList.contains('active')) {
            clearInterval(waitingInterval);
            return;
        }
        
        messageIndex = (messageIndex + 1) % waitingMessages.length;
        updateWaitingStatus(waitingMessages[messageIndex]);
    }, 3000);
    
    // Store the interval ID to clear it when needed
    window.waitingStatusInterval = waitingInterval;
}

// Handle cancel search
function handleCancelSearch() {
    if (socket && socket.readyState === WebSocket.OPEN) {
        // Send cancel message to server
        socket.send(JSON.stringify({
            type: 'cancel_search'
        }));
        
        // Close the connection
        socket.close();
    }
    
    // Clear user data
    userId = null;
    username = null;
    
    // Return to login screen
    showScreen(loginScreen);
    loginStatus.textContent = 'Search cancelled. You may connect again.';
    loginStatus.style.color = 'var(--notification-color)';
    
    // Clear username input for fresh start
    usernameInput.value = '';
    usernameInput.focus();
}

// Handle WebSocket messages
function handleSocketMessage(event) {
    console.log('WebSocket message received:', event);
    try {
        const rawData = event.data;
        console.log('Raw message data:', rawData);
        
        const data = JSON.parse(rawData);
        console.log('Parsed message data:', data);
        console.log('Message type:', data.type);
        
        switch (data.type) {
            case 'login_success':
                userId = data.userId;
                console.log('Login successful, userId:', userId);
                console.log('Full login success data:', data);
                
                // Show waiting screen
                showScreen(waitingScreen);
                updateWaitingStatus('Waiting for a partner...');
                break;
                
            case 'login_error':
                // Show error message
                showScreen(loginScreen);
                loginStatus.textContent = data.message || 'Login failed. Please try again.';
                loginStatus.style.color = 'var(--error-color)';
                break;
                
            case 'matched':
                // Store room ID and partner username
                roomId = data.roomId;
                partnerUsername = data.partner;
                
                // Update UI
                partnerUsernameElement.textContent = partnerUsername;
                
                // Show chat screen
                showScreen(chatScreen);
                
                // Clear previous messages
                chatMessages.innerHTML = '';
                
                // Show system message
                showSystemMessage(`You are now chatting with ${partnerUsername}`);
                
                // Auto-focus message input
                messageInput.focus();
                break;
                
            case 'message':
                // Display message
                displayMessage(data.content, data.sender, 'message', data.timestamp);
                break;
                
            case 'typing':
                // Show typing indicator
                if (data.isTyping) {
                    typingIndicator.textContent = `${partnerUsername} typing...`;
                    typingIndicator.classList.add('active');
                } else {
                    typingIndicator.classList.remove('active');
                }
                break;
                
            case 'skip_request':
                // Show skip overlay
                skipOverlay.classList.add('active');
                
                // Start countdown
                let countdown = 3;
                skipCountdown.textContent = countdown;
                
                skipCountdownTimer = setInterval(() => {
                    countdown--;
                    skipCountdown.textContent = countdown;
                    
                    if (countdown <= 0) {
                        clearInterval(skipCountdownTimer);
                        completeSkip();
                    }
                }, 1000);
                break;
                
            case 'skip_cancel':
                // Hide skip overlay and cancel countdown
                cancelSkip();
                break;
                
            case 'disconnected':
            case 'partner_disconnected':
            case 'partner_skipped':
                // Show system message
                let messageText = '';
                if (data.type === 'disconnected') {
                    messageText = `${partnerUsername} has disconnected`;
                } else if (data.type === 'partner_skipped') {
                    messageText = 'Your chat partner has left the conversation';
                } else {
                    messageText = data.message || 'Your chat partner has disconnected';
                }
                
                showSystemMessage(messageText);
                
                // Reset state variables
                const oldRoomId = roomId;
                roomId = null;
                partnerUsername = null;
                
                // Return to waiting screen after a delay
                setTimeout(() => {
                    // Only proceed if we're not already in a new chat
                    if (!chatScreen.classList.contains('active')) {
                        // Clear chat messages
                        chatMessages.innerHTML = '';
                        
                        // Hide typing indicator
                        typingIndicator.classList.remove('active');
                        
                        // Show waiting screen if not already in a new chat
                        showScreen(waitingScreen);
                        updateWaitingStatus('Finding a new connection...');
                        
                        // First ensure we're removed from any existing queue
                        if (socket && socket.readyState === WebSocket.OPEN) {
                            socket.send(JSON.stringify({
                                type: 'cancel_search'
                            }));
                            
                            // Use a single timeout with a reasonable delay
                            setTimeout(() => {
                                // Double-check we're still in waiting screen and socket is open
                                if (waitingScreen.classList.contains('active') && socket && socket.readyState === WebSocket.OPEN) {
                                    console.log('Sending login request to re-enter queue after partner disconnect/skip');
                                    socket.send(JSON.stringify({
                                        type: 'login',
                                        username: username
                                    }));
                                }
                            }, 1500); // Longer delay to ensure server has processed previous messages
                        }
                    }
                }, 3000);
                break;
                
            case 'report_acknowledged':
                showSystemMessage(data.message);
                break;
                
            default:
                console.log('Unknown message type:', data.type);
        }
    } catch (error) {
        console.error('Error handling WebSocket message:', error);
    }
}

// Send a chat message
function sendMessage() {
    const message = messageInput.value.trim();
    
    if (!message) return;
    
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: 'message',
            content: message,
            username: username
        }));
        
        // Display the message in the chat
        displayMessage(message, username, 'outgoing', Date.now());
        
        // Clear input
        messageInput.value = '';
        
        // Reset typing status
        if (isTyping) {
            isTyping = false;
            socket.send(JSON.stringify({
                type: 'typing',
                isTyping: false,
                username: username
            }));
        }
    } else {
        showSystemMessage('Connection lost. Please refresh the page.');
    }
}

// Display a message in the chat
function displayMessage(content, sender, type, timestamp) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', type);
    
    if (type === 'system') {
        // System messages are simple text
        messageElement.textContent = content;
    } else {
        // Create a single line for user messages
        const messageWrapper = document.createElement('div');
        messageWrapper.classList.add('message-wrapper');
        
        // Create timestamp (hidden by default)
        const timestampElement = document.createElement('span');
        timestampElement.classList.add('message-timestamp');
        timestampElement.textContent = formatTimestamp(timestamp);
        
        // Create sender with colon
        const senderElement = document.createElement('span');
        senderElement.classList.add('message-sender');
        senderElement.textContent = sender + ':';
        
        // Create message content with glitch effect
        const contentElement = document.createElement('span');
        contentElement.classList.add('message-content');
        contentElement.appendChild(glitchText(content));
        
        // Add elements in order: timestamp (hidden), username, content
        messageWrapper.appendChild(timestampElement);
        messageWrapper.appendChild(senderElement);
        messageWrapper.appendChild(document.createTextNode(' '));
        messageWrapper.appendChild(contentElement);
        
        messageElement.appendChild(messageWrapper);
    }
    
    chatMessages.appendChild(messageElement);
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Show system message
function showSystemMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', 'system');
    messageElement.innerHTML = message; // Use innerHTML instead of textContent to render emoji
    
    chatMessages.appendChild(messageElement);
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Handle typing event
function handleTypingEvent() {
    // Check if typing state has changed
    const currentlyTyping = messageInput.value.length > 0;
    
    if (currentlyTyping !== isTyping) {
        isTyping = currentlyTyping;
        
        // Send typing status to server
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
                type: 'typing',
                isTyping: isTyping,
                username: username
            }));
        }
    }
    
    // Clear typing timeout if it exists
    if (typingTimer) {
        clearTimeout(typingTimer);
    }
    
    // Set timeout to stop typing indicator after 1 second of inactivity
    if (isTyping) {
        typingTimer = setTimeout(() => {
            isTyping = false;
            
            // Send typing status to server
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                    type: 'typing',
                    isTyping: false,
                    username: username
                }));
            }
        }, 1000);
    }
}

// Initiate skip
function initiateSkip() {
    // Show skip overlay with a glitch effect
    skipOverlay.classList.add('active');
    
    // Add a sound effect (terminal beep)
    const beepSound = new Audio('data:audio/wav;base64,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');
    beepSound.volume = 0.2;
    beepSound.play();
    
    // Start countdown with visual effects
    let countdown = 3;
    skipCountdown.textContent = countdown;
    
    skipCountdownTimer = setInterval(() => {
        countdown--;
        skipCountdown.textContent = countdown;
        
        // Play a beep sound for each second
        beepSound.play();
        
        // Visual effect for countdown change
        skipCountdown.classList.add('pulse');
        setTimeout(() => {
            skipCountdown.classList.remove('pulse');
        }, 200);
        
        if (countdown <= 0) {
            clearInterval(skipCountdownTimer);
            completeSkip();
        }
    }, 1000);
}

// Cancel skip
function cancelSkip() {
    skipOverlay.classList.remove('active');
    clearInterval(skipCountdownTimer);
}

// Complete skip
function completeSkip() {
    // Clear any existing timers to prevent multiple executions
    clearInterval(skipCountdownTimer);
    
    // Remove skip overlay
    skipOverlay.classList.remove('active');
    
    // Reset state variables
    const oldRoomId = roomId;
    roomId = null;
    partnerUsername = null;
    
    if (socket && socket.readyState === WebSocket.OPEN) {
        // Send skip message to server
        socket.send(JSON.stringify({
            type: 'skip',
            username: username,
            roomId: oldRoomId // Send the room ID to ensure server can identify the correct room
        }));
        
        // Clear chat messages
        document.getElementById('chat-messages').innerHTML = '';
        
        // Hide typing indicator
        document.getElementById('typing-indicator').style.display = 'none';
        typingIndicator.classList.remove('active');
        
        // Show waiting screen
        showScreen(waitingScreen);
        updateWaitingStatus('Finding a new connection...');
        
        // First ensure we're removed from any existing queue
        socket.send(JSON.stringify({
            type: 'cancel_search'
        }));
        
        // Use a single timeout with a reasonable delay to prevent rapid retries
        setTimeout(() => {
            // Check if we're still in waiting screen and socket is open
            if (waitingScreen.classList.contains('active') && socket && socket.readyState === WebSocket.OPEN) {
                console.log('Sending login request to re-enter queue');
                socket.send(JSON.stringify({
                    type: 'login',
                    username: username
                }));
            }
        }, 1500); // Longer delay to ensure server has processed previous messages
    }
}

// Report user
function reportUser() {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: 'report',
            reportedUser: partnerUsername,
            reportingUser: username
        }));
        
        showSystemMessage('Report sent. Thank you for helping keep the platform safe.');
    }
}

// Helper functions
function showScreen(screen) {
    // Hide all screens
    loginScreen.classList.remove('active');
    waitingScreen.classList.remove('active');
    chatScreen.classList.remove('active');
    
    // Show the requested screen
    screen.classList.add('active');
    
    // If switching to waiting or login screen, clear chat messages
    if (screen === waitingScreen || screen === loginScreen) {
        // Clear chat messages
        chatMessages.innerHTML = '';
    }
    
    // Hide chat-specific elements when not in chat screen
    if (screen !== chatScreen) {
        // Hide typing indicator and other chat-specific elements
        document.getElementById('typing-indicator').style.display = 'none';
        
        // Make sure chat header elements are not visible on other screens
        if (document.querySelector('.connection-info')) {
            document.querySelector('.connection-info').style.visibility = 'hidden';
        }
        if (document.querySelector('.chat-controls')) {
            document.querySelector('.chat-controls').style.visibility = 'hidden';
        }
        // Hide chat messages container
        document.getElementById('chat-messages').style.display = 'none';
    } else {
        // Show chat-specific elements only in chat screen
        if (document.querySelector('.connection-info')) {
            document.querySelector('.connection-info').style.visibility = 'visible';
        }
        if (document.querySelector('.chat-controls')) {
            document.querySelector('.chat-controls').style.visibility = 'visible';
        }
        // Show chat messages container
        document.getElementById('chat-messages').style.display = 'block';
    }
}

function updateWaitingStatus(message) {
    waitingStatus.textContent = message;
}

function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
