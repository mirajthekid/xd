// Voice call functionality for ephemeral chat
class VoiceCallManager {
    constructor() {
        this.peer = null;
        this.localStream = null;
        this.remoteStream = null;
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
        
        // Initialize event listeners
        this.initializeEventListeners();
    }
    
    initializeEventListeners() {
        // Call button click handler
        this.callBtn?.addEventListener('click', () => this.initiateCall());
        
        // Mute button click handler
        this.muteBtn?.addEventListener('click', () => this.toggleMute());
        
        // End call button click handler
        this.endCallBtn?.addEventListener('click', () => this.endCall());
        
        // Handle beforeunload to end call if page is closed
        window.addEventListener('beforeunload', () => {
            if (this.isInCall) {
                this.endCall();
            }
        });
    }
    
    // Set the current room ID (called when a chat is started)
    setRoom(roomId) {
        this.currentRoomId = roomId;
        this.updateCallButtonState();
    }
    
    // Update call button state based on current room and call status
    updateCallButtonState() {
        if (!this.callBtn) return;
        
        if (this.currentRoomId && !this.isInCall) {
            this.callBtn.disabled = false;
            this.callBtn.title = 'Start Voice Call';
        } else {
            this.callBtn.disabled = true;
            this.callBtn.title = this.isInCall ? 'Call in progress' : 'Not in a chat';
        }
    }
    
    // Initialize a new call
    async initiateCall() {
        if (this.isInCall || !this.currentRoomId) return;
        
        try {
            // Request microphone access
            this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.isCaller = true;
            this.isInCall = true;
            this.isMuted = false;
            
            // Show call interface
            this.showCallInterface('Calling...');
            
            // Create a new peer connection
            this.createPeerConnection();
            
            // Add local audio stream
            this.localStream.getTracks().forEach(track => {
                this.peer.addTrack(track, this.localStream);
            });
            
            // Send call initiation to the other user
            this.sendWebSocketMessage({
                type: 'call_initiate',
                roomId: this.currentRoomId
            });
            
        } catch (error) {
            console.error('Error accessing microphone:', error);
            this.showCallError('Could not access microphone');
            this.cleanupCall();
        }
    }
    
    // Handle incoming call
    handleIncomingCall() {
        if (this.isInCall || !this.currentRoomId) return;
        
        this.isCaller = false;
        this.isInCall = true;
        this.showCallInterface('Incoming call...');
        
        // Auto-answer after a short delay
        setTimeout(() => this.answerCall(), 1000);
    }
    
    // Answer an incoming call
    async answerCall() {
        if (!this.isInCall || this.isCaller) return;
        
        try {
            // Request microphone access
            this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // Create peer connection
            this.createPeerConnection();
            
            // Add local audio stream
            this.localStream.getTracks().forEach(track => {
                this.peer.addTrack(track, this.localStream);
            });
            
            // Send answer signal
            this.sendWebSocketMessage({
                type: 'call_signal',
                roomId: this.currentRoomId,
                signal: this.peer.localDescription
            });
            
            this.updateCallStatus('Connected');
            
        } catch (error) {
            console.error('Error answering call:', error);
            this.showCallError('Could not answer call');
            this.cleanupCall();
        }
    }
    
    // Create a new peer connection
    createPeerConnection() {
        this.peer = new SimplePeer({
            initiator: this.isCaller,
            trickle: true
        });
        
        // Handle signal data (for WebRTC signaling)
        this.peer.on('signal', (data) => {
            if (data.type === 'offer' || data.type === 'answer') {
                this.sendWebSocketMessage({
                    type: 'call_signal',
                    roomId: this.currentRoomId,
                    signal: data
                });
            }
        });
        
        // Handle incoming stream
        this.peer.on('stream', (stream) => {
            this.remoteStream = stream;
            this.updateCallStatus('Connected');
        });
        
        // Handle connection state changes
        this.peer.on('connect', () => {
            console.log('WebRTC connected');
            this.updateCallStatus('Connected');
        });
        
        this.peer.on('close', () => {
            console.log('WebRTC connection closed');
            this.endCall();
        });
        
        this.peer.on('error', (err) => {
            console.error('WebRTC error:', err);
            this.showCallError('Connection error');
            this.cleanupCall();
        });
    }
    
    // Handle incoming WebRTC signal
    handleSignal(signal) {
        if (!this.peer) return;
        
        try {
            this.peer.signal(signal);
        } catch (error) {
            console.error('Error handling signal:', error);
        }
    }
    
    // Toggle mute state
    toggleMute() {
        if (!this.localStream) return;
        
        this.isMuted = !this.isMuted;
        this.localStream.getAudioTracks().forEach(track => {
            track.enabled = !this.isMuted;
        });
        
        this.muteBtn.textContent = this.isMuted ? 'Unmute' : 'Mute';
    }
    
    // End the current call
    endCall() {
        if (this.isInCall) {
            // Notify the other user
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
        // Stop all tracks in the local stream
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }
        
        // Close peer connection
        if (this.peer) {
            this.peer.destroy();
            this.peer = null;
        }
        
        this.isInCall = false;
        this.isCaller = false;
        this.updateCallButtonState();
    }
    
    // Show call interface
    showCallInterface(status) {
        if (this.callOverlay && this.callStatus) {
            this.callStatus.textContent = status;
            this.callOverlay.classList.remove('hidden');
        }
    }
    
    // Hide call interface
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
    }
    
    // Show call error
    showCallError(message) {
        this.updateCallStatus(`Error: ${message}`);
        setTimeout(() => this.hideCallInterface(), 2000);
    }
    
    // Helper to send WebSocket messages
    sendWebSocketMessage(message) {
        if (window.ws && window.ws.readyState === WebSocket.OPEN) {
            window.ws.send(JSON.stringify(message));
        } else {
            console.error('WebSocket not connected');
        }
    }
}

// Initialize voice call manager when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Create global voiceCallManager instance
    window.voiceCallManager = new VoiceCallManager();
    
    // Override window's setRoom function to update voice call manager
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
