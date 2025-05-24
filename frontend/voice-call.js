// Voice call functionality for ephemeral chat
class VoiceCallManager {
    constructor() {
        this.peer = null;
        this.localStream = null;
        this.remoteAudio = null;
        this.isCaller = false;
        this.isInCall = false;
        this.currentRoomId = null;
        this.isMuted = false;
        this.ws = null;
        this.callTimeout = null;
        
        // Initialize DOM elements
        this.initializeDOMElements();
        
        // Bind methods
        this.init = this.init.bind(this);
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
        
        // Initialize
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
        this.ws = window.ws || new WebSocket('wss://yourserver.com/ws');
        this.setupWebSocketHandlers();
        this.updateUI();
    }
    
    // Set up WebSocket message handlers
    setupWebSocketHandlers() {
        this.ws = window.ws;
        
        if (!this.ws) {
            console.error('WebSocket connection not found');
            return;
        }
        
        // Add a flag to prevent multiple listeners
        if (this.ws._hasVoiceCallHandler) {
            console.log('WebSocket handler already set up');
            return;
        }
        
        console.log('Setting up WebSocket handlers for voice calls');
        
        const messageHandler = async (event) => {
            try {
                console.log('Received WebSocket message:', event.data);
                
                // Skip non-JSON messages (like ping/pong)
                if (typeof event.data !== 'string' || !event.data.startsWith('{')) {
                    console.log('Skipping non-JSON message');
                    return;
                }
                
                const data = JSON.parse(event.data);
                console.log('Parsed WebSocket data:', data);
                
                // Only process call-related messages
                if (!['call_initiate', 'call_signal', 'end_call'].includes(data.type)) {
                    console.log('Skipping non-call message type:', data.type);
                    return;
                }
                
                console.log('Processing call message type:', data.type);
                
                switch (data.type) {
                    case 'call_initiate':
                        console.log('Incoming call in room:', data.roomId);
                        if (data.roomId === this.currentRoomId) {
                            await this.handleIncomingCall();
                        } else {
                            console.log('Ignoring call for different room:', data.roomId);
                        }
                        break;
                        
                    case 'call_signal':
                        console.log('Received call signal:', data.signal);
                        if (data.roomId === this.currentRoomId) {
                            await this.handleSignal(data.signal);
                        } else {
                            console.log('Ignoring signal for different room:', data.roomId);
                        }
                        break;
                        
                    case 'end_call':
                        console.log('Received end call signal');
                        if (!data.roomId || data.roomId === this.currentRoomId) {
                            this.handleCallEnd();
                        }
                        break;
                        
                    default:
                        console.log('Unhandled message type:', data.type);
                }
            } catch (error) {
                console.error('Error processing WebSocket message:', error);
                console.error('Message that caused error:', event.data);
            }
        };
        
        // Add the event listener
        this.ws.addEventListener('message', messageHandler);
        this.ws._hasVoiceCallHandler = true;
        
        console.log('WebSocket handlers set up successfully');
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
        
        try {
            this.isCaller = false;
            this.isInCall = true;
            this.updateUI();
            
            // Get local media stream if not already available
            if (!this.localStream) {
                this.localStream = await navigator.mediaDevices.getUserMedia({ 
                    audio: true, 
                    video: false 
                });
                console.log('Obtained local media stream for answering call');
            }
            
            // Create peer connection if not already created
            if (!this.peer) {
                await this.setupPeerConnection();
            }
            
            // Set remote description
            console.log('Setting remote description with offer');
            await this.peer.setRemoteDescription(new RTCSessionDescription(offer));
            
            // Create and set local description (answer)
            console.log('Creating answer');
            const answer = await this.peer.createAnswer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: false
            });
            
            console.log('Setting local description with answer');
            await this.peer.setLocalDescription(answer);
            
            // The answer will be sent through the onicecandidate handler
            
        } catch (error) {
            console.error('Error handling call offer:', error);
            this.cleanupCall();
            this.updateUI();
            
            // Notify the other peer about the error
            this.sendSignal({
                type: 'error',
                message: 'Failed to handle call offer: ' + error.message
            });
        }
    }
    
    // Handle call answer from remote peer
    async handleCallAnswer(answer) {
        if (!this.peer || !this.isCaller) return;
        
        try {
            await this.peer.setRemoteDescription(new RTCSessionDescription(answer));
        } catch (error) {
            console.error('Error handling call answer:', error);
            this.cleanupCall();
        }
    }
    
    // Handle ICE candidate
    async handleICECandidate(candidate) {
        if (!this.peer) return;
        
        try {
            if (candidate) {
                await this.peer.addIceCandidate(new RTCIceCandidate(candidate));
            }
        } catch (error) {
            console.error('Error handling ICE candidate:', error);
        }
    }
    
    // Handle call end
    handleCallEnd() {
        this.cleanupCall();
        this.updateUI();
    }
    
    // Send signal through WebSocket
    sendSignal(data) {
        if (!this.currentRoomId) {
            console.error('Cannot send signal: No room ID set');
            return;
        }
        
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.error('WebSocket is not connected');
            
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
        console.log('Call button clicked!');
        
        if (this.isInCall) {
            console.log('Already in a call, cannot initiate another');
            return;
        }
        
        if (!this.currentRoomId) {
            console.error('No room ID set. Cannot initiate call without a room.');
            alert('Error: Not connected to a chat room');
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
        if (this.peer) {
            this.peer.ontrack = null;
            this.peer.onicecandidate = null;
            this.peer.onconnectionstatechange = null;
            this.peer.close();
            this.peer = null;
        }
        
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }
        
        if (this.remoteAudio) {
            this.remoteAudio.srcObject = null;
        }
        
        this.isInCall = false;
        this.isCaller = false;
    }
}

// Initialize when the page loads
window.addEventListener('DOMContentLoaded', () => {
    const voiceCallManager = new VoiceCallManager();
    
    // Make it globally available if needed
    window.voiceCallManager = voiceCallManager;
});
