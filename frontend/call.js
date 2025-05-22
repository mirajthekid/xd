// Call functionality for the chat application
class CallManager {
    constructor() {
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
            // --- WebRTC logic start ---
            this.isCalling = true;
            this.callButton.classList.add('active');
            this.callStatus.textContent = 'Calling...';
            this.callInterface.classList.add('active');

            // Peer connection config
            if (this.peerConnection) this.peerConnection.close();
            this.peerConnection = new RTCPeerConnection({
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' }
                ]
            });

            // ICE candidate handler
            this.peerConnection.onicecandidate = (event) => {
                if (event.candidate && this.socket && this.roomId && this.partnerUsername) {
                    this.socket.send(JSON.stringify({
                        type: 'ice-candidate',
                        candidate: event.candidate,
                        roomId: this.roomId,
                        recipient: this.partnerUsername
                    }));
                }
            };

            // Remote media handler
            this.peerConnection.ontrack = (event) => {
                if (this.remoteAudio && this.remoteAudio.srcObject !== event.streams[0]) {
                    this.remoteAudio.srcObject = event.streams[0];
                    this.remoteAudio.play().catch(e => console.error('Error playing remote audio:', e));
                }
            };

            // Get user media
            this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            this.localAudio.srcObject = this.localStream;
            this.localStream.getTracks().forEach(track => this.peerConnection.addTrack(track, this.localStream));

            // Create and send offer
            const offer = await this.peerConnection.createOffer();
            await this.peerConnection.setLocalDescription(offer);
            if (this.socket && this.roomId && this.partnerUsername) {
                this.socket.send(JSON.stringify({
                    type: 'call-offer',
                    offer: offer,
                    roomId: this.roomId,
                    recipient: this.partnerUsername
                }));
                this.isCalling = true;
                this.callStatus.textContent = 'Calling ' + this.partnerUsername + '...';
                this.callInterface.classList.add('active');
            }
            // --- WebRTC logic end ---
        } catch (error) {
            console.error('Error starting call:', error);
            this.callStatus.textContent = 'Failed to start call';
            this.endCall();
        }
    }

    // WebRTC: Remove simulateIncomingCall and acceptCall, replaced by handleCallOffer/handleCallAnswer
    // --- WebRTC logic for offer/answer/candidate ---
    async handleCallOffer(offerData) {
        try {
            if (this.peerConnection) this.peerConnection.close();
            this.peerConnection = new RTCPeerConnection({
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' }
                ]
            });
            this.peerConnection.onicecandidate = (event) => {
                if (event.candidate && this.socket && this.roomId && this.partnerUsername) {
                    this.socket.send(JSON.stringify({
                        type: 'ice-candidate',
                        candidate: event.candidate,
                        roomId: this.roomId,
                        recipient: this.partnerUsername
                    }));
                }
            };
            this.peerConnection.ontrack = (event) => {
                if (this.remoteAudio && this.remoteAudio.srcObject !== event.streams[0]) {
                    this.remoteAudio.srcObject = event.streams[0];
                    this.remoteAudio.play().catch(e => console.error('Error playing remote audio:', e));
                }
            };
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offerData.offer));
            if (!this.localStream) {
                this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
                this.localAudio.srcObject = this.localStream;
                this.localStream.getTracks().forEach(track => this.peerConnection.addTrack(track, this.localStream));
            }
            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);
            this.socket.send(JSON.stringify({
                type: 'call-answer',
                answer: answer,
                roomId: this.roomId,
                recipient: this.partnerUsername
            }));
            this.isInCall = true;
            this.isCalling = false;
            this.callStatus.textContent = 'In call with ' + this.partnerUsername;
            this.callStartTime = Date.now();
            this.startCallTimer();
        } catch (error) {
            this.callStatus.textContent = 'Error handling call offer';
            this.endCall();
            console.error(error);
        }
    }

    async handleCallAnswer(answerData) {
        try {
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answerData.answer));
            this.isInCall = true;
            this.isCalling = false;
            this.callStatus.textContent = 'In call with ' + this.partnerUsername;
            this.callStartTime = Date.now();
            this.startCallTimer();
        } catch (error) {
            this.callStatus.textContent = 'Error connecting call';
            this.endCall();
            console.error(error);
        }
    }

    async handleIceCandidate(candidateData) {
        try {
            await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidateData.candidate));
        } catch (error) {
            console.error('Error adding ICE candidate:', error);
        }
    }

    endCall() {
        if (this.socket && this.roomId && this.partnerUsername && (this.isInCall || this.isCalling)) {
            this.socket.send(JSON.stringify({
                type: 'call-end',
                roomId: this.roomId,
                recipient: this.partnerUsername
            }));
        }
        this.endCallCleanup();
    }

    endCallCleanup() {
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }
        this.isCalling = false;
        this.isInCall = false;
        if (this.callButton) this.callButton.classList.remove('active');
        if (this.callInterface) this.callInterface.classList.remove('active');
        if (this.callTimer) clearInterval(this.callTimer);
        if (this.callTimer) this.callTimer.textContent = '00:00';
        if (this.remoteAudio) this.remoteAudio.srcObject = null;
        if (this.localAudio) this.localAudio.srcObject = null;
        if (this.callStatus) this.callStatus.textContent = 'Call ended';
    }

    handleCallEndSignal() {
        this.endCallCleanup();
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



    handleWebSocketMessage(message) {
        // WebRTC signaling message routing
        switch (message.type) {
            case 'call-offer':
                this.handleCallOffer(message);
                break;
            case 'call-answer':
                this.handleCallAnswer(message);
                break;
            case 'ice-candidate':
                this.handleIceCandidate(message);
                break;
            case 'call-end':
                this.handleCallEndSignal();
                break;
            case 'call-error':
                if (this.callStatus) this.callStatus.textContent = message.message;
                setTimeout(() => this.endCallCleanup(), 3000);
                break;
            default:
                // Other message types can be handled elsewhere
                break;
        }
    }
}

// Initialize call manager when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if we're on the chat screen
    if (document.getElementById('chat-screen')) {
        window.callManager = new CallManager();
    }
});
