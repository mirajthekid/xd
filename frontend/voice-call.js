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
        
        // DOM Elements
        this.callBtn = document.getElementById('call-btn');
        this.callOverlay = document.getElementById('call-overlay');
        this.callStatus = document.getElementById('call-status');
        this.muteBtn = document.getElementById('mute-btn');
        this.endCallBtn = document.getElementById('end-call-btn');
        
        // Bind methods
        this.initiateCall = this.initiateCall.bind(this);
        this.toggleMute = this.toggleMute.bind(this);
        this.endCall = this.endCall.bind(this);
        this.answerCall = this.answerCall.bind(this);
        this.handleSignal = this.handleSignal.bind(this);
        this.createPeerConnection = this.createPeerConnection.bind(this);
        
        // Initialize event listeners
        this.initializeEventListeners();
    }
    
    initializeEventListeners() {
        if (this.callBtn) {
            this.callBtn.addEventListener('click', this.initiateCall);
        }
        if (this.muteBtn) {
            this.muteBtn.addEventListener('click', this.toggleMute);
        }
        if (this.endCallBtn) {
            this.endCallBtn.addEventListener('click', this.endCall);
        }
        window.addEventListener('beforeunload', () => this.isInCall && this.endCall());
    }
    
    // Set the current room ID
    setRoom(roomId) {
        this.currentRoomId = roomId;
        this.updateCallButtonState();
    }
    
    // Update call button state based on current room and call status
    updateCallButtonState() {
        if (!this.callBtn) return;
        this.callBtn.disabled = !!(this.isInCall || !this.currentRoomId);
    }
    
    // Check if we're in a secure context (HTTPS or localhost)
    isSecureContext() {
        return window.isSecureContext || 
               window.location.hostname === 'localhost' || 
               window.location.hostname === '127.0.0.1';
    }
    
    // Show error message to the user
    showCallError(message) {
        console.error('Call error:', message);
        if (this.callStatus) {
            this.callStatus.textContent = `Error: ${message}`;
        }
        setTimeout(() => this.hideCallInterface(), 3000);
    }
    
    // Show the call interface
    showCallInterface(status = '') {
        if (this.callOverlay && this.callStatus) {
            this.callStatus.textContent = status;
            this.callOverlay.classList.remove('hidden');
        }
    }
    
    // Hide the call interface
    hideCallInterface() {
        if (this.callOverlay) {
            this.callOverlay.classList.add('hidden');
        }
    }
    
    // Update call status text
    updateCallStatus(status) {
        if (this.callStatus) {
            this.callStatus.textContent = status;
        }
    }    // Create a new peer connection
        createPeerConnection() {
            if (!window.SimplePeer) {
                console.error('SimplePeer not loaded');
                return;
            }
    
            const config = {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' }
                ]
            };
            
            this.peer = new SimplePeer({
                initiator: this.isCaller,
                trickle: true,
                config: config
            });
            
            this.peer.on('signal', (data) => {
                if (data.type === 'offer' || data.type === 'answer') {
                    this.sendWebSocketMessage({
                        type: 'call_signal',
                        roomId: this.currentRoomId,
                        signal: data
                    });
                }
            });
            
            this.peer.on('stream', (stream) => {
                this.remoteAudio = new Audio();
                this.remoteAudio.srcObject = stream;
                this.remoteAudio.autoplay = true;
                this.updateCallStatus('Connected');
            });
            
            this.peer.on('connect', () => {
                console.log('WebRTC connected');
                this.updateCallStatus('Connected');
            });
            
            this.peer.on('close', () => this.endCall());
            this.peer.on('error', (err) => {
                console.error('WebRTC error:', err);
                this.handleCallError(err);
            });
        }
        
        // Handle incoming WebRTC signal
        handleSignal(signal) {
            if (this.peer) {
                this.peer.signal(signal);
            }
        }
        
        // Handle call errors
        handleCallError(error) {
            let errorMessage = 'Call failed';
            if (error.name === 'NotAllowedError') {
                errorMessage = 'Microphone access was denied';
            } else if (error.name === 'NotFoundError') {
                errorMessage = 'No microphone found';
            } else if (error.name === 'NotReadableError') {
                errorMessage = 'Microphone is already in use';
            }
            this.showCallError(errorMessage);
        }    // Initiate a new call
            async initiateCall() {
                if (this.isInCall || !this.currentRoomId) return;
                
                if (!this.isSecureContext()) {
                    this.showCallError('Voice calls require a secure connection (HTTPS)');
                    return;
                }
                
                try {
                    this.updateCallStatus('Requesting microphone...');
                    this.localStream = await navigator.mediaDevices.getUserMedia({ 
                        audio: {
                            echoCancellation: true,
                            noiseSuppression: true
                        } 
                    });
                    
                    this.isCaller = true;
                    this.isInCall = true;
                    this.isMuted = false;
                    
                    this.showCallInterface('Calling...');
                    this.createPeerConnection();
                    
                    // Add local stream to peer connection
                    this.localStream.getTracks().forEach(track => {
                        this.peer.addTrack(track, this.localStream);
                    });
                    
                    this.sendWebSocketMessage({
                        type: 'call_initiate',
                        roomId: this.currentRoomId
                    });
                    
                } catch (error) {
                    console.error('Call error:', error);
                    this.handleCallError(error);
                }
            }
            
            // Handle incoming call
            handleIncomingCall() {
                if (this.isInCall || !this.currentRoomId) return;
                this.isCaller = false;
                this.isInCall = true;
                this.showCallInterface('Incoming call...');
            }
            
            // Answer an incoming call
            async answerCall() {
                if (!this.isInCall || this.isCaller) return;
                
                try {
                    this.localStream = await navigator.mediaDevices.getUserMedia({ 
                        audio: true 
                    });
                    
                    this.createPeerConnection();
                    this.localStream.getTracks().forEach(track => {
                        this.peer.addTrack(track, this.localStream);
                    });
                    
                    this.updateCallStatus('Connected');
                } catch (error) {
                    console.error('Answer call error:', error);
                    this.handleCallError(error);
                }
            }
            
            // Toggle mute state
            toggleMute() {
                if (!this.localStream) return;
                this.isMuted = !this.isMuted;
                this.localStream.getAudioTracks().forEach(track => {
                    track.enabled = !this.isMuted;
                });
                if (this.muteBtn) {
                    this.muteBtn.textContent = this.isMuted ? 'Unmute' : 'Mute';
                }
            }
            
            // End the current call
            endCall() {
                if (this.isInCall) {
                    this.sendWebSocketMessage({
                        type: 'call_end',
                        roomId: this.currentRoomId
                    });
                }
                this.cleanupCall();
                this.hideCallInterface();
            }
            
            // Clean up call resources
            cleanupCall() {
                if (this.localStream) {
                    this.localStream.getTracks().forEach(track => track.stop());
                    this.localStream = null;
                }
                if (this.remoteAudio) {
                    this.remoteAudio.pause();
                    this.remoteAudio = null;
                }
                if (this.peer) {
                    this.peer.destroy();
                    this.peer = null;
                }
                this.isInCall = false;
                this.isCaller = false;
                this.isMuted = false;
                this.updateCallButtonState();
            }
            
            // Send a WebSocket message
            sendWebSocketMessage(message) {
                if (window.ws && window.ws.readyState === WebSocket.OPEN) {
                    window.ws.send(JSON.stringify(message));
                } else {
                    console.error('WebSocket not connected');
                }
            }
        }
        
        // Initialize voice call manager when DOM is loaded
        document.addEventListener('DOMContentLoaded', () => {
            window.voiceCallManager = new VoiceCallManager();
            
            // Override setRoom to update voice call manager
            const originalSetRoom = window.setRoom;
            window.setRoom = function(roomId) {
                if (window.voiceCallManager) {
                    window.voiceCallManager.setRoom(roomId);
                }
                if (originalSetRoom) {
                    originalSetRoom(roomId);
                }
            };
        });