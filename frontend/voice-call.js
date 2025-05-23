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
                
                switch (data.type) {
                    case 'call_offer':
                        await this.handleCallOffer(data.offer);
                        break;
                    case 'call_answer':
                        await this.handleCallAnswer(data.answer);
                        break;
                    case 'ice_candidate':
                        await this.handleICECandidate(data.candidate);
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
        if (this.isInCall) return;
        
        try {
            this.isCaller = false;
            this.isInCall = true;
            this.updateUI();
            
            // Get local media stream
            this.localStream = await navigator.mediaDevices.getUserMedia({ 
                audio: true, 
                video: false 
            });
            
            // Create peer connection
            await this.setupPeerConnection();
            
            // Set remote description and create answer
            await this.peer.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await this.peer.createAnswer();
            await this.peer.setLocalDescription(answer);
            
            // Send answer to caller
            this.sendSignal({
                type: 'call_answer',
                answer: answer
            });
            
        } catch (error) {
            console.error('Error handling call offer:', error);
            this.cleanupCall();
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
        
        const message = {
            ...data,
            roomId: this.currentRoomId
        };
        
        this.ws.send(JSON.stringify(message));
    }
    
    // Initiate a call
    async initiateCall() {
        if (this.isInCall) return;
        
        try {
            this.isCaller = true;
            this.isInCall = true;
            this.updateUI();
            
            // Get local media stream
            this.localStream = await navigator.mediaDevices.getUserMedia({ 
                audio: true, 
                video: false 
            });
            
            // Create peer connection
            await this.setupPeerConnection();
            
            // Create and set local description
            const offer = await this.peer.createOffer();
            await this.peer.setLocalDescription(offer);
            
            // Send offer to other peer
            this.sendSignal({
                type: 'call_offer',
                offer: offer
            });
            
        } catch (error) {
            console.error('Error initiating call:', error);
            this.cleanupCall();
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
