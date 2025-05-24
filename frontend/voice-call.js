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
    
    // Initialize the voice call manager
    async init() {
        console.log('Initializing VoiceCallManager');
        this.setupWebSocketHandler();
        this.setupEventListeners();
    }
    
    // Set up WebSocket message handler
    async setupWebSocketHandler() {
        if (!this.ws) {
            console.error('WebSocket is not available');
            return;
        }
        
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
                        await this.handleIncomingCall(data.signal);
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
                if (this.isInCall) {
                    this.cleanupCall();
                }
            }
        };
        
        // Error handler
        const errorHandler = (error) => {
            console.error('WebSocket error:', error);
            if (this.isInCall) {
                this.cleanupCall();
            }
        };
        
        // Close handler
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
        
        // Add event listeners
        this.ws.addEventListener('message', messageHandler);
        this.ws.addEventListener('error', errorHandler);
        this.ws.addEventListener('close', closeHandler);
        
        // Store references for cleanup
        this.ws._hasVoiceCallHandler = true;
        this.ws._voiceCallMessageHandler = messageHandler;
        this.ws._voiceCallErrorHandler = errorHandler;
        this.ws._voiceCallCloseHandler = closeHandler;
    }
    
    // Initialize DOM elements
    initializeDOMElements() {
        this.callButton = document.getElementById('call-btn');
        console.log('callButton element:', this.callButton ? 'Found' : 'NOT Found');
        this.muteButton = document.getElementById('mute-btn');
        console.log('muteButton element:', this.muteButton ? 'Found' : 'NOT Found');
        this.endCallButton = document.getElementById('end-call-btn');
        console.log('endCallButton element:', this.endCallButton ? 'Found' : 'NOT Found');
        this.remoteAudio = document.getElementById('remote-audio');
        console.log('remoteAudio element:', this.remoteAudio ? 'Found' : 'NOT Found');
        this.callStatus = document.getElementById('call-status');
        console.log('callStatus element:', this.callStatus ? 'Found' : 'NOT Found');
    }
    
    // Set up event listeners
    setupEventListeners() {
        console.log('Setting up event listeners...');
        if (this.callButton) {
            console.log('Adding click listener to callButton.');
            this.callButton.addEventListener('click', () => this.initiateCall());
        } else {
            console.log('callButton is NULL, cannot add click listener.');
        }
        
        if (this.muteButton) {
            this.muteButton.addEventListener('click', () => this.toggleMute());
        }
        
        if (this.endCallButton) {
            this.endCallButton.addEventListener('click', () => this.endCall());
        }
    }
    
    // Initialize UI elements
    initializeUI() {
        this.updateUI();
    }
    
    // Update UI based on call state
    updateUI() {
        if (this.isInCall) {
            if (this.callButton) this.callButton.style.display = 'none';
            if (this.muteButton) this.muteButton.style.display = 'inline-block';
            if (this.endCallButton) this.endCallButton.style.display = 'inline-block';
            if (this.callStatus) this.callStatus.textContent = 'In call...';
        } else {
            if (this.callButton) this.callButton.style.display = 'inline-block';
            if (this.muteButton) this.muteButton.style.display = 'none';
            if (this.endCallButton) this.endCallButton.style.display = 'none';
            if (this.callStatus) this.callStatus.textContent = 'Ready';
        }
    }
    
    // Update call button state based on room ID
    updateCallButtonState() {
        if (this.callButton) {
            this.callButton.disabled = !this._currentRoomId;
        }
    }
    
    // Set the current room ID
    set currentRoomId(roomId) {
        this._currentRoomId = roomId;
        this.updateCallButtonState();
        console.log('Room ID set to:', this._currentRoomId);
    }
    
    // Get the current room ID
    get currentRoomId() {
        return this._currentRoomId;
    }
    
    // Initialize a call
    async initiateCall() {
        console.log('--- initiateCall CALLED ---');
        console.log('Current room ID for call:', this.currentRoomId);
        console.log('Is in call already:', this.isInCall);
        console.log('WebSocket instance available:', !!this.ws);
        if (this.ws) { console.log('WebSocket readyState:', this.ws.readyState); }
        if (!this.currentRoomId) {
            console.error('Cannot initiate call: No room ID set');
            if (this.callStatus) {
                this.callStatus.textContent = 'Error: Not connected to a chat room';
            }
            return;
        }
        
        if (this.isInCall) {
            console.log('Already in a call');
            return;
        }
        
        try {
            this.isCaller = true;
            this.isInCall = true;
            console.log('Updating UI for call initiation...');
            this.updateUI();
            
            // Get local media stream
            console.log('Attempting to get user media (audio)...');
            try { this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false }); console.log('Got user media successfully.'); } catch (err) { console.error('Error getting user media:', err); this.cleanupCall(); return; }
            
            // Set up peer connection
            console.log('Attempting to set up peer connection...');
            try { await this.setupPeerConnection(); console.log('Peer connection setup successfully.'); } catch (err) { console.error('Error setting up peer connection:', err); this.cleanupCall(); return; }
            
            // Create offer
            console.log('Attempting to create offer...');
            let offer; try { offer = await this.peer.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: false, voiceActivityDetection: true }); console.log('Offer created successfully.'); } catch (err) { console.error('Error creating offer:', err); this.cleanupCall(); return; }
            
            console.log('Attempting to set local description with offer...');
            try { await this.peer.setLocalDescription(offer); console.log('Local description set successfully.'); } catch (err) { console.error('Error setting local description:', err); this.cleanupCall(); return; }
            
            // Send the offer through WebSocket
            console.log('Attempting to send call_initiate message via WebSocket...');
            console.log('Call initiate message payload:', JSON.stringify({ type: 'call_initiate', roomId: this.currentRoomId, signal: offer }, null, 2));
            try { this.ws.send(JSON.stringify({ type: 'call_initiate', roomId: this.currentRoomId, signal: offer })); console.log('call_initiate message sent.'); } catch (err) { console.error('Error sending call_initiate message:', err); this.cleanupCall(); return; }
            
        } catch (error) {
            console.error('Error initiating call:', error);
            this.cleanupCall();
            if (this.callStatus) {
                this.callStatus.textContent = `Error: ${error.message}`;
            }
        }
    }
    
    // Handle incoming call
    async handleIncomingCall(offer) {
        if (this.isInCall) {
            console.log('Already in a call, rejecting incoming call');
            this.sendSignal({ type: 'call_rejected', reason: 'User is busy' });
            return;
        }
        
        // Show incoming call UI
        if (confirm('Incoming call. Answer?')) {
            await this.answerCall(offer);
        } else {
            this.rejectCall();
        }
    }
    
    // Answer an incoming call
    async answerCall(offer) {
        if (!this.currentRoomId) {
            console.error('Cannot answer call: No room ID set');
            return;
        }
        
        try {
            this.isInCall = true;
            this.isCaller = false;
            this.updateUI();
            
            // Get local media stream
            this.localStream = await navigator.mediaDevices.getUserMedia({ 
                audio: true, 
                video: false 
            });
            
            // Set up peer connection
            await this.setupPeerConnection();
            await this.peer.setRemoteDescription(new RTCSessionDescription(offer));
            
            // Create answer
            const answer = await this.peer.createAnswer({
                offerToReceiveAudio: true,
                voiceActivityDetection: true
            });
            
            await this.peer.setLocalDescription(answer);
            
            // Send the answer through WebSocket
            this.sendSignal({
                type: 'call_signal',
                signal: answer,
                roomId: this.currentRoomId
            });
            
        } catch (error) {
            console.error('Error answering call:', error);
            this.cleanupCall();
            if (this.callStatus) {
                this.callStatus.textContent = `Error: ${error.message}`;
            }
        }
    }
    
    // Reject an incoming call
    rejectCall() {
        this.sendSignal({
            type: 'call_rejected',
            reason: 'User declined'
        });
        this.cleanupCall();
    }
    
    // End the current call
    endCall() {
        this.sendSignal({
            type: 'end_call',
            roomId: this.currentRoomId
        });
        this.cleanupCall();
    }
    
    // Toggle mute state
    toggleMute() {
        if (!this.localStream) return;
        
        const audioTracks = this.localStream.getAudioTracks();
        if (audioTracks.length > 0) {
            const isMuted = !audioTracks[0].enabled;
            audioTracks[0].enabled = isMuted;
            
            if (this.muteButton) {
                this.muteButton.textContent = isMuted ? 'Mute' : 'Unmute';
            }
        }
    }
    
    // Set up peer connection
    async setupPeerConnection() {
        if (this.peer) {
            console.log('Peer connection already exists');
            return;
        }
        
        try {
            // Create RTCPeerConnection
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
            
            // Set up event handlers
            this.peer.onicecandidate = (event) => {
                if (event.candidate) {
                    this.sendSignal({
                        type: 'call_signal',
                        signal: {
                            type: 'candidate',
                            candidate: event.candidate
                        },
                        roomId: this.currentRoomId
                    });
                }
            };
            
            this.peer.ontrack = (event) => {
                if (event.streams && event.streams[0]) {
                    this.remoteStream = event.streams[0];
                    if (this.remoteAudio) {
                        this.remoteAudio.srcObject = this.remoteStream;
                        this.remoteAudio.play().catch(e => console.error('Error playing remote audio:', e));
                    }
                }
            };
            
            this.peer.oniceconnectionstatechange = () => {
                console.log('ICE connection state:', this.peer.iceConnectionState);
                
                if (this.peer.iceConnectionState === 'failed' || 
                    this.peer.iceConnectionState === 'disconnected' ||
                    this.peer.iceConnectionState === 'closed') {
                    console.log('ICE connection failed or closed, cleaning up');
                    this.cleanupCall();
                }
            };
            
            this.peer.onsignalingstatechange = () => {
                console.log('Signaling state:', this.peer.signalingState);
            };
            
            this.peer.onconnectionstatechange = () => {
                console.log('Connection state:', this.peer.connectionState);
            };
            
            console.log('Peer connection created');
            
        } catch (error) {
            console.error('Error setting up peer connection:', error);
            this.cleanupCall();
            throw error;
        }
    }
    
    // Handle WebRTC signaling
    async handleSignal(signal) {
        if (!this.peer) {
            console.error('No peer connection to handle signal');
            return;
        }
        
        try {
            if (signal.type === 'offer') {
                console.log('Received offer, creating answer...');
                await this.peer.setRemoteDescription(new RTCSessionDescription(signal));
                
                const answer = await this.peer.createAnswer({
                    offerToReceiveAudio: true,
                    voiceActivityDetection: true
                });
                
                await this.peer.setLocalDescription(answer);
                
                this.sendSignal({
                    type: 'call_signal',
                    signal: answer,
                    roomId: this.currentRoomId
                });
                
            } else if (signal.type === 'answer') {
                console.log('Received answer');
                await this.peer.setRemoteDescription(new RTCSessionDescription(signal));
                
            } else if (signal.type === 'candidate') {
                console.log('Received ICE candidate');
                await this.peer.addIceCandidate(new RTCIceCandidate(signal.candidate));
                
            } else {
                console.warn('Unknown signal type:', signal.type);
            }
            
        } catch (error) {
            console.error('Error handling signal:', error);
            this.cleanupCall();
        }
    }
    
    // Send signal through WebSocket
    sendSignal(data) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.error('WebSocket is not connected');
            return;
        }
        
        if (!this.currentRoomId) {
            console.error('Cannot send signal: No room ID set');
            return;
        }
        
        try {
            const message = JSON.stringify({
                type: 'call_signal',
                roomId: this.currentRoomId,
                ...data
            });
            
            this.ws.send(message);
            console.log('Sent signal:', data.type);
            
        } catch (error) {
            console.error('Error sending signal:', error);
        }
    }
    
    // Clean up call resources
    cleanupCall() {
        console.log('Cleaning up call resources');
        
        // Stop all tracks in local stream
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }
        
        // Close peer connection
        if (this.peer) {
            this.peer.onicecandidate = null;
            this.peer.ontrack = null;
            this.peer.oniceconnectionstatechange = null;
            this.peer.onsignalingstatechange = null;
            this.peer.onconnectionstatechange = null;
            this.peer.close();
            this.peer = null;
        }
        
        // Clean up remote audio
        if (this.remoteAudio) {
            this.remoteAudio.pause();
            this.remoteAudio.srcObject = null;
        }
        
        // Reset call state
        this.isInCall = false;
        this.isCaller = false;
        this.remoteStream = null;
        
        // Clear any active timeouts
        if (this.callTimeout) {
            clearTimeout(this.callTimeout);
            this.callTimeout = null;
        }
        
        // Update UI
        this.updateUI();
        
        if (this.callStatus) {
            this.callStatus.textContent = 'Call ended';
        }
        
        console.log('Call cleanup complete');
    }
}

// Initialize voice call manager when the page loads
window.voiceCallManager = new VoiceCallManager();
