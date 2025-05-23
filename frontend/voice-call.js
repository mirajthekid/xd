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
        this.callButton = document.getElementById('call-button');
        this.endCallButton = document.getElementById('end-call-button');
        this.muteButton = document.getElementById('mute-button');
        this.callStatus = document.getElementById('call-status');
        this.remoteAudio = document.getElementById('remote-audio');
        
        // Add event listeners
        if (this.callButton) this.callButton.addEventListener('click', this.initiateCall);
        if (this.endCallButton) this.endCallButton.addEventListener('click', this.endCall);
        if (this.muteButton) this.muteButton.addEventListener('click', this.toggleMute);
    }
    
    // Initialize the voice call manager
    init() {
        this.ws = window.ws || new WebSocket('wss://yourserver.com/ws');
        this.setupWebSocketHandlers();
        this.updateUI();
    }
    
    // Set up WebSocket message handlers
    setupWebSocketHandlers() {
        if (!this.ws) return;
        
        this.ws.addEventListener('message', async (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('Received WebSocket message:', data);
                
                switch (data.type) {
                    case 'call_initiate':
                        // Start the call when receiving call_initiate
                        await this.answerCall();
                        break;
                    case 'call_signal':
                        // Handle WebRTC signaling
                        if (data.signal) {
                            if (data.signal.type === 'offer') {
                                await this.handleCallOffer(data.signal);
                            } else if (data.signal.type === 'answer') {
                                await this.handleCallAnswer(data.signal);
                            } else if (data.signal.candidate) {
                                await this.handleICECandidate(data.signal);
                            }
                        }
                        break;
                    case 'call_end':
                        this.handleCallEnd();
                        break;
                }
            } catch (error) {
                console.error('Error handling WebSocket message:', error);
            }
        });
    }
    
    // Update UI based on call state
    updateUI() {
        if (this.callButton) this.callButton.disabled = this.isInCall;
        if (this.endCallButton) this.endCallButton.style.display = this.isInCall ? 'block' : 'none';
        if (this.muteButton) this.muteButton.style.display = this.isInCall ? 'block' : 'none';
        
        if (this.callStatus) {
            this.callStatus.textContent = this.isInCall 
                ? (this.isCaller ? 'Calling...' : 'Incoming call...') 
                : 'Ready to call';
        }
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
    }
    
    // Send signal through WebSocket
    sendSignal(data) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.error('WebSocket not connected');
            return;
        }
        
        try {
            const message = {
                type: 'call_signal',
                roomId: this.currentRoomId,
                signal: data
            };
            
            console.log('Sending WebSocket message:', message);
            this.ws.send(JSON.stringify(message));
        } catch (error) {
            console.error('Error sending WebSocket message:', error);
        }
    }
    
    // Answer an incoming call
    async answerCall() {
        if (this.isInCall) {
            console.log('Already in a call, cannot answer another');
            return;
        }
        
        try {
            console.log('Answering call...');
            this.isCaller = false;
            this.isInCall = true;
            this.updateUI();
            
            // Get local media stream
            this.localStream = await navigator.mediaDevices.getUserMedia({ 
                audio: true, 
                video: false 
            });
            
            console.log('Local media stream obtained');
            
            // Create peer connection
            await this.setupPeerConnection();
            
            // The offer will be handled by the signal handler
            
        } catch (error) {
            console.error('Error answering call:', error);
            this.cleanupCall();
            this.updateUI();
            
            // Notify the other peer about the error
            this.sendSignal({
                type: 'error',
                message: 'Failed to answer call'
            });
        }
    }
    
    // Initiate a call
    async initiateCall() {
        if (this.isInCall || !this.currentRoomId) {
            console.log('Already in call or no room ID');
            return;
        }
        
        try {
            this.isCaller = true;
            this.isInCall = true;
            this.updateUI();
            
            console.log('Initiating call in room:', this.currentRoomId);
            
            // First, send call initiation to server
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                const message = {
                    type: 'call_initiate',
                    roomId: this.currentRoomId
                };
                console.log('Sending call_initiate:', message);
                this.ws.send(JSON.stringify(message));
            }
            
            // Get local media stream
            this.localStream = await navigator.mediaDevices.getUserMedia({ 
                audio: true, 
                video: false 
            });
            
            // Create peer connection
            await this.setupPeerConnection();
            
            // Create and set local description
            const offer = await this.peer.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: false
            });
            
            await this.peer.setLocalDescription(offer);
            
            // The offer will be sent through the onicecandidate handler
            
        } catch (error) {
            console.error('Error initiating call:', error);
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
