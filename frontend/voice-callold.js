// Voice call functionality for ephemeral chat
class VoiceCallManager {
    constructor() {
        // WebRTC and media stream references
        this.peer = null;
        this.localStream = null;
        this.remoteStream = null;
        
        // Call state
        this.isInCall = false;
        this.isCaller = false;
        this._currentRoomId = window.currentRoomId || null;
        this.callStatus = null;
        this.callTimeout = null;
        
        // WebSocket reference
        this.ws = window.ws;
        
        // DOM elements
        this.muteButton = null;
        this.endCallButton = null;
        this.callButton = null;
        this.remoteAudio = null;
        
        // Bind methods
        this.init = this.init.bind(this);
        this.initializeUI = this.initializeUI.bind(this);
        this.initializeDOMElements = this.initializeDOMElements.bind(this);
        this.initiateCall = this.initiateCall.bind(this);
        this.answerCall = this.answerCall.bind(this);
        this.endCall = this.endCall.bind(this);
        this.toggleMute = this.toggleMute.bind(this);
        this.cleanupCall = this.cleanupCall.bind(this);
        this.updateUI = this.updateUI.bind(this);
        this.sendSignal = this.sendSignal.bind(this);
        this.handleSignal = this.handleSignal.bind(this);
        this.setupPeerConnection = this.setupPeerConnection.bind(this);
        this.handleIncomingCall = this.handleIncomingCall.bind(this);
        this.rejectCall = this.rejectCall.bind(this);
        this.updateCallButtonState = this.updateCallButtonState.bind(this);
        
        console.log('VoiceCallManager initializing with room ID:', this._currentRoomId);
        
        // Initialize components
        this.initializeDOMElements();
        this.initializeUI();
        this.init();
    }
    
    // Initialize DOM elements
    initializeDOMElements() {
        // Get the call button from the chat header
        this.callButton = document.getElementById('call-btn');
        // Get buttons from the call overlay
        this.endCallButton = document.getElementById('end-call-btn');
        this.muteButton = document.getElementById('mute-btn');
        this.callStatus = document.getElementById('call-status');
        this.remoteAudio = document.getElementById('remote-audio');
        
        console.log('Initializing DOM elements:', {
            callButton: this.callButton,
            endCallButton: this.endCallButton,
            muteButton: this.muteButton,
            callStatus: this.callStatus,
            remoteAudio: this.remoteAudio
        });
        
        // Add event listeners if elements exist
        if (this.callButton) {
            console.log('Adding click listener to call button');
            this.callButton.addEventListener('click', this.initiateCall);
        } else {
            console.error('Call button not found!');
        }
        
        if (this.endCallButton) {
            this.endCallButton.addEventListener('click', this.endCall);
        } else {
            console.error('End call button not found!');
        }
        
        if (this.muteButton) {
            this.muteButton.addEventListener('click', this.toggleMute);
        } else {
            console.error('Mute button not found!');
        }
    }
    
    // Initialize the voice call manager
    init() {
        this.setupWebSocketHandler();
        this.updateUI();
    }
    
    // Set up WebSocket message handler
    setupWebSocketHandler() {
        try {
            if (!this.ws) {
                console.warn('WebSocket connection not found, attempting to create one');
                this.ws = new WebSocket('wss://' + window.location.host + '/ws');
                
                // Wait for WebSocket to be open
                return new Promise((resolve, reject) => {
                    const onOpen = () => {
                        this.ws.removeEventListener('open', onOpen);
                        this.ws.removeEventListener('error', onError);
                        this._setupWebSocketMessageHandler();
                        resolve();
                    };
                    
                    const onError = (error) => {
                        this.ws.removeEventListener('open', onOpen);
                        this.ws.removeEventListener('error', onError);
                        console.error('Failed to create WebSocket connection:', error);
                        reject(error);
                    };
                    
                    this.ws.addEventListener('open', onOpen);
                    this.ws.addEventListener('error', onError);
                });
            }
            
            // If WebSocket is already open, set up the handler directly
            if (this.ws.readyState === WebSocket.OPEN) {
                this._setupWebSocketMessageHandler();
            } else {
                // If WebSocket is connecting, wait for it to open
                return new Promise((resolve, reject) => {
                    const onOpen = () => {
                        this.ws.removeEventListener('open', onOpen);
                        this.ws.removeEventListener('error', onError);
                        this._setupWebSocketMessageHandler();
                        resolve();
                    };
                    
                    const onError = (error) => {
                        this.ws.removeEventListener('open', onOpen);
                        this.ws.removeEventListener('error', onError);
                        console.error('WebSocket connection error:', error);
                        reject(error);
                    };
                    
                    this.ws.addEventListener('open', onOpen);
                    this.ws.addEventListener('error', onError);
                });
            }
        } catch (error) {
            console.error('Error setting up WebSocket handler:', error);
            throw error;
        }
    }
    
    // Internal method to set up the WebSocket message handler
    _setupWebSocketMessageHandler() {
        // Add a flag to prevent multiple listeners
        if (this.ws._hasVoiceCallHandler) {
            console.log('WebSocket handler already set up');
            return;
        }

        console.log('Setting up WebSocket message handler for voice calls');

        const messageHandler = async (event) => {
            try {
                console.log('Received WebSocket message:', event.data);
                
                // Skip non-JSON messages
                if (typeof event.data !== 'string' || !event.data.trim().startsWith('{')) {
                    console.log('Skipping non-JSON message');
                    return;
                }
                
                let data;
                try {
                    data = JSON.parse(event.data);
                } catch (parseError) {
                    console.error('Failed to parse WebSocket message:', parseError);
                    return;
                }
                
                console.log('Processing message type:', data.type);
                
                if (!data.type) {
                    console.warn('Received message without type:', data);
                    return;
                }
                
                switch (data.type) {
                    case 'call_initiate':
                        await this.handleIncomingCall();
                        break;
                    case 'call_signal':
                        if (data.signal) {
                            await this.handleSignal(data.signal);
                        } else {
                            console.warn('Received call_signal without signal data');
                        }
                        break;
                    case 'end_call':
                        this.handleCallEnd();
                        break;
                    case 'call_rejected':
                        console.log('Call was rejected:', data.reason || 'No reason provided');
                        this.cleanupCall();
                        if (this.callStatus) {
                            this.callStatus.textContent = `Call rejected: ${data.reason || 'No reason provided'}`;
                        }
                        break;
                    default:
                        console.log('Unhandled message type:', data.type);
                }
            } catch (error) {
                console.error('Error processing WebSocket message:', error);
                // Try to clean up if there was an error
                if (this.isInCall) {
                    this.cleanupCall();
                }
            }
        };

        this.ws.addEventListener('message', messageHandler);
        this.ws._hasVoiceCallHandler = true;
        this.ws._voiceCallMessageHandler = messageHandler;
        
        // Set up error handler
        const errorHandler = (error) => {
            console.error('WebSocket error:', error);
            if (this.isInCall) {
                this.cleanupCall();
            }
        };
        
        this.ws.addEventListener('error', errorHandler);
        this.ws._voiceCallErrorHandler = errorHandler;
        
        // Set up close handler
        const closeHandler = () => {
            console.log('WebSocket connection closed');
            if (this.isInCall) {
                this.cleanupCall();
            }
            // Attempt to reconnect after a delay
            if (this.ws.readyState === WebSocket.CLOSED) {
                setTimeout(() => {
                    console.log('Attempting to reconnect WebSocket...');
                    this.ws = null;
                    this.setupWebSocketHandler().catch(console.error);
                }, 3000);
            }
        };
        
        this.ws.addEventListener('close', closeHandler);
        this.ws._voiceCallCloseHandler = closeHandler;
    }
    
    // Update UI based on call state
    updateUI() {
        const callOverlay = document.getElementById('call-overlay');
        
        // Update call button state
        if (this.callButton) {
            this.callButton.disabled = this.isInCall;
            this.callButton.style.display = this.isInCall ? 'none' : 'block';
        }
        
        // Update call overlay visibility
        if (callOverlay) {
            if (this.isInCall) {
                callOverlay.classList.remove('hidden');
            } else {
                callOverlay.classList.add('hidden');
            }
        }
        
        // Update call status text
        if (this.callStatus) {
            this.callStatus.textContent = this.isInCall 
                ? (this.isCaller ? 'Calling...' : 'Incoming call...') 
                : 'Ready to call';
        }
        
        console.log('UI updated:', {
            isInCall: this.isInCall,
            isCaller: this.isCaller,
            callOverlayVisible: callOverlay && !callOverlay.classList.contains('hidden')
        });
    }
    
    // Toggle mute state
    toggleMute() {
        if (!this.localStream) return;
        
        const audioTracks = this.localStream.getAudioTracks();
        if (audioTracks.length > 0) {
            const isCurrentlyMuted = !audioTracks[0].enabled;
            audioTracks[0].enabled = isCurrentlyMuted;
            
            if (this.muteButton) {
                this.muteButton.textContent = isCurrentlyMuted ? 'Mute' : 'Unmute';
            }
        }
    }
    
    // Handle call offer from remote peer
    async handleCallOffer(offer) {
        if (this.isInCall) {
            console.log('Already in a call, ignoring offer');
            return;
        }
        
        console.log('Handling call offer:', offer);
        
            if (!this.peer) {
                console.log('No peer connection, creating one...');
                await this.setupPeerConnection();
            }
            
            // Set remote description
            await this.peer.setRemoteDescription(new RTCSessionDescription(signal));
            
            // Create and set local description (answer)
            const answer = await this.peer.createAnswer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: false,
                voiceActivityDetection: true
            });
            
            await this.peer.setLocalDescription(answer);
            
            // Send the answer back to the caller
            this.sendSignal({
                type: 'answer',
                sdp: answer.sdp
            });
            
        } else if (signal.type === 'answer') {
            console.log('Received answer');
            // If we're in a call and lose connection, clean up
            if (this.isInCall) {
                console.error('WebSocket disconnected during call, cleaning up...');
                this.cleanupCall();
                this.updateUI();
                
                if (this.callStatus) {
                    this.callStatus.textContent = 'Connection lost';
                }
            }
            return;
        }
        
        try {
            const message = {
                type: 'call_signal',
                roomId: this.currentRoomId,
                signal: data
            };
            
            // Log a preview of the message (without the full SDP)
            const logMessage = {
                ...message,
                signal: data.type === 'offer' || data.type === 'answer' ? 
                    { ...data, sdp: data.sdp ? data.sdp.substring(0, 80) + '...' : '' } : data
            };
            
            console.log('Sending signal:', JSON.stringify(logMessage, null, 2));
            this.ws.send(JSON.stringify(message));
        } catch (error) {
            console.error('Error sending signal:', error);
            
            // If we're in a call and hit an error, clean up
            if (this.isInCall) {
                this.cleanupCall();
                this.updateUI();
            }
        }
    }
    
    // Set up WebRTC peer connection
    async setupPeerConnection() {
        const configuration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' }
            ]
        };
        
        this.peer = new RTCPeerConnection(configuration);
        
        // Add local stream to peer connection
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                this.peer.addTrack(track, this.localStream);
            });
        }
        
        // Handle remote stream
        this.peer.ontrack = (event) => {
            if (this.remoteAudio) {
                this.remoteAudio.srcObject = event.streams[0];
            }
        };
        
        // Handle ICE candidates
        this.peer.onicecandidate = (event) => {
            if (event.candidate) {
                this.sendSignal({
                    type: 'ice_candidate',
                    candidate: event.candidate
                });
            }
        };
        
        // Handle connection state changes
        this.peer.onconnectionstatechange = () => {
            if (this.peer.connectionState === 'disconnected' || 
                this.peer.connectionState === 'failed') {
                this.cleanupCall();
            }
        };
        
        return this.peer;
    }
    
    // Handle incoming call
    async handleIncomingCall() {
        console.log('Handling incoming call...');
        
        if (this.isInCall) {
            console.log('Already in a call, rejecting incoming call');
            this.sendSignal({
                type: 'call_rejected',
                reason: 'User is already in a call'
            });
            return;
        }
        
        this.isInCall = true;
        this.isCaller = false;
        this.updateUI();
        
        console.log('Incoming call UI updated, waiting for user action...');
        
        // Set a timeout to automatically reject the call if not answered
        this.callTimeout = setTimeout(() => {
            if (this.isInCall && !this.peer) {
                console.log('Call timeout - auto rejecting');
                this.rejectCall('No response');
            }
        }
        return;
    }

    try {
        const message = {
            type: 'call_signal',
            roomId: this.currentRoomId,
            signal: data
        };

        // Log a preview of the message (without the full SDP)
        const logMessage = {
            ...message,
            signal: data.type === 'offer' || data.type === 'answer' ? 
                { ...data, sdp: data.sdp ? data.sdp.substring(0, 80) + '...' : '' } : data
        };

        console.log('Sending signal:', JSON.stringify(logMessage, null, 2));
        this.ws.send(JSON.stringify(message));
    } catch (error) {
        console.error('Error sending signal:', error);

        // If we're in a call and hit an error, clean up
        if (this.isInCall) {
            this.cleanupCall();
            this.updateUI();
        }
    }
}

// Set up WebRTC peer connection
async setupPeerConnection() {
    const configuration = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' }
        ]
    };

    this.peer = new RTCPeerConnection(configuration);

    // Add local stream to peer connection
    if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
            this.peer.addTrack(track, this.localStream);
        });
            });
        }
        
        // Set up event handlers
        this.peer.ontrack = (event) => {
            console.log('Received remote stream');
            if (this.remoteAudio) {
                this.remoteAudio.srcObject = event.streams[0];
            }
        };
        
        this.peer.onicecandidate = (event) => {
            if (event.candidate) {
                this.handleICECandidate(event.candidate);
            }
        };
        
        this.peer.onconnectionstatechange = () => {
            console.log('Peer connection state changed:', this.peer.connectionState);
            if (this.peer.connectionState === 'disconnected' || 
                this.peer.connectionState === 'failed') {
                this.cleanupCall();
            }
        };
        
        return this.peer;
        
    } catch (error) {
        console.error('Error setting up peer connection:', error);
        this.cleanupCall();
        throw error;
    }
}

// Handle incoming call
async handleIncomingCall() {
    console.log('Handling incoming call...');
    
    if (this.isInCall) {
        console.log('Already in a call, rejecting incoming call');
        this.sendSignal({
            type: 'call_rejected',
            reason: 'User is already in a call'
        });
        return;
    }
    
    this.isInCall = true;
    this.isCaller = false;
    this.updateUI();
    
    // Auto-reject after 30 seconds if not answered
    this.callTimeout = setTimeout(() => {
        if (this.isInCall && !this.peer) {
            console.log('Call timeout - auto rejecting');
            this.rejectCall('No response');
        }
    }, 30000); // 30 seconds to answer
}

// Reject an incoming call
rejectCall(reason = 'Call rejected') {
    console.log('Rejecting call:', reason);

    // Clear the call timeout
    if (this.callTimeout) {
        clearTimeout(this.callTimeout);
        this.callTimeout = null;
    }

    // Notify the other peer
    this.sendSignal({
        type: 'call_rejected',
        reason: reason
    });

    // Clean up
    this.cleanupCall();
    this.updateUI();
}

// Answer an incoming call
async answerCall() {
    console.log('Answering call...');

    if (this.isInCall && this.peer) {
        console.log('Already in a call, cannot answer another');
        return;
    }

    // Clear any pending call timeout
    if (this.callTimeout) {
        clearTimeout(this.callTimeout);
        this.callTimeout = null;
    }

    try {
        this.isInCall = true;
        this.updateUI();

        console.log('Requesting microphone access...');

        // Get local media stream with better audio settings
        this.localStream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            },
            video: false 
        });

        console.log('Microphone access granted, setting up peer connection...');

        // Create peer connection
        await this.setupPeerConnection();

        // Create and set local description (answer)
        console.log('Creating answer...');
        const answer = await this.peer.createAnswer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: false,
            voiceActivityDetection: true
        });

        console.log('Setting local description with answer...');
        await this.peer.setLocalDescription(answer);

        // Send the answer back to the caller
        console.log('Sending answer to caller...');
        this.sendSignal({
            type: 'call_signal',
            signal: answer
        });

        console.log('Call answered successfully');

    } catch (error) {
        console.error('Error answering call:', error);

        // Send error to the other peer
        this.sendSignal({
            type: 'error',
            message: 'Failed to answer call: ' + (error.message || 'Unknown error')
        });

        // Clean up
        this.cleanupCall();
        this.updateUI();

        // Show error to user
        if (this.callStatus) {
            this.callStatus.textContent = 'Error: ' + (error.message || 'Failed to answer call');
        }
    }    
}

// Initiate a call
async initiateCall() {
    console.log('=== Call button clicked ===');
    console.log('Current VoiceCallManager state:', {
        currentRoomId: this.currentRoomId,
        isInCall: this.isInCall,
        isCaller: this.isCaller,
        wsReadyState: this.ws ? this.ws.readyState : 'No WebSocket',
        localStream: this.localStream ? 'Available' : 'Not available'
    });

    if (this.isInCall) {
        const errorMsg = 'Already in a call, cannot initiate another';
        console.error(errorMsg);
        if (this.callStatus) {
            this.callStatus.textContent = errorMsg;
            clearTimeout(this.callTimeout);
            this.callTimeout = null;
        }
        
        try {
            this.isInCall = true;
            this.updateUI();
            
            console.log('Requesting microphone access...');
            
            // Get local media stream with better audio settings
            this.localStream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                },
                video: false 
            });
            
            console.log('Microphone access granted, setting up peer connection...');
            
            // Create peer connection
            await this.setupPeerConnection();
            
            // Create and set local description (answer)
            console.log('Creating answer...');
            const answer = await this.peer.createAnswer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: false,
                voiceActivityDetection: true
            });
            
            console.log('Setting local description with answer...');
            await this.peer.setLocalDescription(answer);
            
            // Send the answer back to the caller
            console.log('Sending answer to caller...');
            this.sendSignal({
                type: 'call_signal',
                signal: answer
            });
            
            console.log('Call answered successfully');
            
        } catch (error) {
            console.error('Error answering call:', error);
            
            // Send error to the other peer
            this.sendSignal({
                type: 'error',
                message: 'Failed to answer call: ' + (error.message || 'Unknown error')
            });
            
            // Clean up
            this.cleanupCall();
            this.updateUI();
            
            // Show error to user
            if (this.callStatus) {
                this.callStatus.textContent = 'Error: ' + (error.message || 'Failed to answer call');
            }
        }    
    }
    
    // Initiate a call
    async initiateCall() {
        console.log('=== Call button clicked ===');
        console.log('Current VoiceCallManager state:', {
            currentRoomId: this.currentRoomId,
            isInCall: this.isInCall,
            isCaller: this.isCaller,
            wsReadyState: this.ws ? this.ws.readyState : 'No WebSocket',
            localStream: this.localStream ? 'Available' : 'Not available'
        });
        
        if (this.isInCall) {
            const errorMsg = 'Already in a call, cannot initiate another';
            console.error(errorMsg);
            if (this.callStatus) {
                this.callStatus.textContent = errorMsg;
            }
            return;
        }
        
        if (!this.currentRoomId) {
            const errorMsg = 'No room ID set. Cannot initiate call without a room. Please wait for a match first.';
            console.error(errorMsg);
            if (this.callStatus) {
                this.callStatus.textContent = 'Error: Not in a chat room';
            }
            alert(errorMsg);
            return;
        }
        
        try {
            console.log('=== Starting call process ===');
            console.log('Room ID:', this.currentRoomId);
            
            // Update UI first to show call is starting
            this.isCaller = true;
            this.isInCall = true;
            this.updateUI();
            
            // 1. Notify the other user that we want to start a call
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                const message = {
                    type: 'call_initiate',
                    roomId: this.currentRoomId
                };
                console.log('Sending call_initiate:', message);
                this.ws.send(JSON.stringify(message));
            } else {
                throw new Error('WebSocket not connected');
            }
            
            // 2. Get local media stream (microphone access)
            console.log('Requesting microphone access...');
            this.localStream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                },
                video: false 
            });
            console.log('Microphone access granted');
            
            // 3. Create peer connection
            console.log('Setting up peer connection...');
            await this.setupPeerConnection();
            
            // 4. Create and set local description (offer)
            console.log('Creating offer...');
            const offer = await this.peer.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: false,
                voiceActivityDetection: true
            });
            
            console.log('Setting local description with offer...');
            await this.peer.setLocalDescription(offer);
            
            console.log('Call initiation complete - waiting for answer...');
            
        } catch (error) {
            console.error('Error during call initiation:', error);
            
            // Show user-friendly error message
            const errorMessage = this.getUserFriendlyError(error);
            if (this.callStatus) {
                this.callStatus.textContent = `Error: ${errorMessage}`;
            } else {
                alert(`Call failed: ${errorMessage}`);
            }
            
            // Clean up and reset UI
            this.cleanupCall();
            this.updateUI();
        }
    }
    
    // End the current call
    endCall() {
        this.sendSignal({
            type: 'call_end'
        });
        this.cleanupCall();
        this.updateUI();
    }
    
    // Convert technical errors to user-friendly messages
    getUserFriendlyError(error) {
        console.log('Raw error:', error);
        
        if (error.name === 'NotAllowedError') {
            return 'Microphone access was denied. Please allow microphone access to make calls.';
        } else if (error.name === 'NotFoundError') {
            return 'No microphone found. Please connect a microphone and try again.';
        } else if (error.name === 'NotReadableError') {
            return 'Could not access the microphone. Another application might be using it.';
        } else if (error.name === 'OverconstrainedError') {
            return 'The requested microphone settings are not supported.';
        } else if (error.message && error.message.includes('room is full')) {
            return 'The chat room is full. Please try again later.';
        } else if (error.message && error.message.includes('not connected')) {
            return 'Connection lost. Please check your internet connection and try again.';
        } else if (error.message) {
            // Return a generic error with the message
            return error.message;
        } else {
            return 'An unknown error occurred. Please try again.';
        }
    }
    
    // Clean up call resources
    cleanupCall() {
        console.log('Cleaning up call resources');
        
        // Stop all tracks in the local stream
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }
        
        // Clean up peer connection
        if (this.peer) {
            this.peer.destroy();
            this.peer = null;
        }
        
        // Reset call state
        this.isInCall = false;
        this.isCaller = false;
        
        // Clear any pending timeouts
        if (this.callTimeout) {
            clearTimeout(this.callTimeout);
            this.callTimeout = null;
        }
        
        // Update UI
        this.updateUI();
        
        console.log('Call resources cleaned up');
    }
    
    // Set the current room ID
    set currentRoomId(roomId) {
        if (roomId !== this._currentRoomId) {
            console.log('VoiceCallManager: Room ID changed from', this._currentRoomId, 'to', roomId);
            this._currentRoomId = roomId;
            window.currentRoomId = roomId; // Keep in sync with global scope
            this.updateCallButtonState();
        }
    }
    
    // Get the current room ID
    get currentRoomId() {
        return this._currentRoomId;
    }
    
    // Update call button state based on room ID
    updateCallButtonState() {
        const callBtn = document.getElementById('call-btn');
        if (callBtn) {
            if (this.currentRoomId) {
                callBtn.disabled = false;
                callBtn.title = 'Start Voice Call';
                callBtn.classList.remove('disabled');
                console.log('Call button enabled for room:', this.currentRoomId);
            } else {
                callBtn.disabled = true;
                callBtn.title = 'Please wait for a match to start a call';
                callBtn.classList.add('disabled');
                console.log('Call button disabled - no room ID');
            }
        } else {
            console.warn('Call button not found for updateCallButtonState');
        }
    }
}

// Initialize when the page loads
window.addEventListener('DOMContentLoaded', () => {
    const voiceCallManager = new VoiceCallManager();
    
    // Make it globally available if needed
    window.voiceCallManager = voiceCallManager;
});
