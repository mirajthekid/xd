// Call functionality for the chat application
class CallManager {
    constructor() {
        // Only initialize if we're on the chat screen
        if (!document.getElementById('chat-screen')) {
            return;
        }
        
        this.localStream = null;
        this.peerConnection = null;
        this.callButton = document.getElementById('call-btn');
        this.callInterface = null;
        this.callStatus = null;
        this.callControls = null;
        this.isCalling = false;
        this.isInCall = false;
        this.callStartTime = null;
        this.callTimer = null;
        
        this.init();
    }

    init() {
        // Create call interface HTML
        this.createCallInterface();
        
        // Add event listeners
        this.callButton.addEventListener('click', () => this.toggleCall());
        
        // Listen for call-related WebSocket messages
        document.addEventListener('wsMessage', (e) => this.handleWebSocketMessage(e.detail));
    }

    createCallInterface() {
        // Create call interface elements
        const callInterface = document.createElement('div');
        callInterface.className = 'call-interface';
        callInterface.id = 'call-interface';
        
        callInterface.innerHTML = `
            <div class="call-status" id="call-status">Calling...</div>
            <div class="call-timer" id="call-timer">00:00</div>
            <div class="call-controls">
                <button class="call-control-button end-call" id="end-call">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"></path>
                        <line x1="23" y1="1" x2="1" y2="23"></line>
                    </svg>
                </button>
            </div>
            <audio id="remote-audio" autoplay></audio>
            <audio id="local-audio" muted autoplay></audio>
        `;
        
        document.body.appendChild(callInterface);
        
        // Store references to call interface elements
        this.callInterface = document.getElementById('call-interface');
        this.callStatus = document.getElementById('call-status');
        this.callTimer = document.getElementById('call-timer');
        this.remoteAudio = document.getElementById('remote-audio');
        this.localAudio = document.getElementById('local-audio');
        
        // Add event listeners for call controls
        document.getElementById('end-call').addEventListener('click', () => this.endCall());
    }

    async toggleCall() {
        if (this.isInCall) {
            this.endCall();
        } else {
            await this.startCall();
        }
    }

    async startCall() {
        try {
            this.isCalling = true;
            this.callButton.classList.add('active');
            this.callStatus.textContent = 'Calling...';
            this.callInterface.classList.add('active');
            
            // Get user media
            this.localStream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: false
            });
            
            // Play local audio (muted)
            this.localAudio.srcObject = this.localStream;
            
            // In a real app, you would create a peer connection and send an offer
            // For now, we'll just simulate a call
            this.simulateIncomingCall();
            
        } catch (error) {
            console.error('Error starting call:', error);
            this.callStatus.textContent = 'Failed to start call';
            this.endCall();
        }
    }

    simulateIncomingCall() {
        // Simulate the other user accepting the call after 2 seconds
        setTimeout(() => {
            if (this.isCalling) {
                this.acceptCall();
            }
        }, 2000);
    }

    acceptCall() {
        this.isCalling = false;
        this.isInCall = true;
        this.callStatus.textContent = 'In call';
        this.callStartTime = Date.now();
        this.startCallTimer();
        
        // In a real app, you would handle the WebRTC connection here
        // For now, we'll just play a test tone on the remote audio
        this.playTestTone();
    }

    endCall() {
        // Stop all media tracks
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }
        
        // Reset UI
        this.isCalling = false;
        this.isInCall = false;
        this.callButton.classList.remove('active');
        this.callInterface.classList.remove('active');
        clearInterval(this.callTimer);
        
        // In a real app, you would close the peer connection here
        
        // Reset call timer
        this.callTimer.textContent = '00:00';
    }

    startCallTimer() {
        clearInterval(this.callTimer);
        
        this.callTimer = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.callStartTime) / 1000);
            const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
            const seconds = (elapsed % 60).toString().padStart(2, '0');
            document.getElementById('call-timer').textContent = `${minutes}:${seconds}`;
        }, 1000);
    }

    playTestTone() {
        // This is just for demonstration
        // In a real app, you would use WebRTC to stream audio
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.start();
        
        // Stop the tone after 100ms (just a beep)
        setTimeout(() => {
            oscillator.stop();
        }, 100);
    }

    handleWebSocketMessage(message) {
        // In a real app, you would handle WebSocket messages for call signaling here
        // For example: call offers, answers, ICE candidates, etc.
        console.log('Call WebSocket message:', message);
        
        // Example:
        // if (message.type === 'call-offer') {
        //     this.handleCallOffer(message);
        // } else if (message.type === 'call-answer') {
        //     this.handleCallAnswer(message);
        // } else if (message.type === 'ice-candidate') {
        //     this.handleICECandidate(message);
        // } else if (message.type === 'call-end') {
        //     this.endCall();
        // }
    }
}

// Initialize call manager when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if we're on the chat screen and not already initialized
    if (document.getElementById('chat-screen') && !window.callManager) {
        window.callManager = new CallManager();
    }
});

// Re-initialize when showing chat screen
document.addEventListener('screenChanged', (e) => {
    if (e.detail.screen === 'chat-screen' && !window.callManager) {
        window.callManager = new CallManager();
    }
});
