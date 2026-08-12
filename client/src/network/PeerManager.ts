import { io, Socket } from 'socket.io-client';

export class PeerManager {
  private socket: Socket;
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private dataChannels: Map<string, RTCDataChannel> = new Map();
  public peerId: string = '';
  public isHost: boolean;
  public roomId: string;
  public onConnect: (peerId: string) => void = () => {};
  public onStateUpdate: (state: any) => void = () => {};
  public onEvent: (event: any) => void = () => {};

  constructor(isHost: boolean, roomId: string, signalingUrl?: string) {
    this.isHost = isHost;
    this.roomId = roomId;

    const url = signalingUrl || `${window.location.protocol}//${window.location.hostname}:3000`;
    this.socket = io(url, { transports: ['websocket', 'polling'] });

    this.socket.on('connect', () => {
      this.peerId = this.socket.id || `peer-${Math.random().toString(36).substring(2, 9)}`;
      console.log(`Connected to signaling server. My Peer ID: ${this.peerId}`);
      this.onConnect(this.peerId);
      this.socket.emit('join-room', roomId);
    });

    // Handle peer connection signals from Socket.IO server
    this.socket.on('peer-connected', (peerSocketId: string) => {
      console.log(`Peer connected: ${peerSocketId}`);
      if (this.isHost) {
        this.initiatePeerConnection(peerSocketId);
      }
    });

    this.socket.on('webrtc-offer', async (data: { sender: string; sdp: RTCSessionDescriptionInit }) => {
      console.log(`Received WebRTC offer from: ${data.sender}`);
      await this.handleOffer(data.sender, data.sdp);
    });

    this.socket.on('webrtc-answer', async (data: { sender: string; sdp: RTCSessionDescriptionInit }) => {
      console.log(`Received WebRTC answer from: ${data.sender}`);
      await this.handleAnswer(data.sender, data.sdp);
    });

    this.socket.on('ice-candidate', async (data: { sender: string; candidate: RTCIceCandidateInit }) => {
      await this.handleIceCandidate(data.sender, data.candidate);
    });
  }

  private createPeerConnection(targetId: string): RTCPeerConnection {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('ice-candidate', {
          target: targetId,
          candidate: event.candidate
        });
      }
    };

    this.peerConnections.set(targetId, pc);
    return pc;
  }

  private async initiatePeerConnection(targetId: string) {
    const pc = this.createPeerConnection(targetId);
    const dc = pc.createDataChannel('game-data', { ordered: false });
    this.setupDataChannel(targetId, dc);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    this.socket.emit('webrtc-offer', {
      target: targetId,
      sdp: offer
    });
  }

  private async handleOffer(senderId: string, sdp: RTCSessionDescriptionInit) {
    const pc = this.createPeerConnection(senderId);

    pc.ondatachannel = (event) => {
      this.setupDataChannel(senderId, event.channel);
    };

    await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    this.socket.emit('webrtc-answer', {
      target: senderId,
      sdp: answer
    });
  }

  private async handleAnswer(senderId: string, sdp: RTCSessionDescriptionInit) {
    const pc = this.peerConnections.get(senderId);
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    }
  }

  private async handleIceCandidate(senderId: string, candidate: RTCIceCandidateInit) {
    const pc = this.peerConnections.get(senderId);
    if (pc && candidate) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.error('Error adding ICE candidate:', e);
      }
    }
  }

  private setupDataChannel(peerId: string, dc: RTCDataChannel) {
    dc.onopen = () => {
      console.log(`DataChannel open with ${peerId}`);
      this.dataChannels.set(peerId, dc);
    };

    dc.onclose = () => {
      console.log(`DataChannel closed with ${peerId}`);
      this.dataChannels.delete(peerId);
    };

    dc.onmessage = (event) => {
      try {
        const raw = event.data;
        const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (this.isHost) {
          this.onEvent(typeof raw === 'string' ? raw : JSON.stringify(raw));
        } else {
          if (data && data.type) {
            this.onEvent(typeof raw === 'string' ? raw : JSON.stringify(raw));
          } else {
            this.onStateUpdate(data);
          }
        }
      } catch (e) {
        console.error('Error parsing DataChannel message:', e);
      }
    };
  }

  public sendEvent(event: any) {
    const payload = typeof event === 'string' ? event : JSON.stringify(event);
    this.dataChannels.forEach((dc) => {
      if (dc.readyState === 'open') {
        dc.send(payload);
      }
    });
  }

  public broadcastState(state: any) {
    const payload = typeof state === 'string' ? state : JSON.stringify(state);
    this.dataChannels.forEach((dc) => {
      if (dc.readyState === 'open') {
        dc.send(payload);
      }
    });
  }

  public disconnect() {
    this.dataChannels.forEach((dc) => dc.close());
    this.peerConnections.forEach((pc) => pc.close());
    this.dataChannels.clear();
    this.peerConnections.clear();
    this.socket.disconnect();
  }
}
