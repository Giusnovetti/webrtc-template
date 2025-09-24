// webrtc.service.ts
import { Injectable } from '@angular/core';
import { SignalingService } from './signaling-service';

@Injectable({
  providedIn: 'root'
})
export class WebrtcService {
  private peerConnection!: RTCPeerConnection;
  private localStream!: MediaStream;
  private remoteStream!: MediaStream;
  private remoteStreamCallback?: (stream: MediaStream) => void;
  private isInitiator = false;

  constructor(private signaling: SignalingService) {}

  async initLocalStream(): Promise<MediaStream> {
    this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    return this.localStream;
  }

  onRemoteStream(callback: (stream: MediaStream) => void) {
    this.remoteStreamCallback = callback;
  }

  async startConnection(sessionId: string = 'test-room', initiator: boolean = false) {
    this.isInitiator = initiator;

    this.peerConnection = new RTCPeerConnection({
      iceServers: [/* Add your STUN/TURN servers here */]
    });

    // Add local tracks
    this.localStream.getTracks().forEach(track => {
      this.peerConnection.addTrack(track, this.localStream);
    });

    this.remoteStream = new MediaStream();
    this.peerConnection.ontrack = event => {
      if (event.streams.length > 0) {
        if (this.remoteStreamCallback) {
          this.remoteStreamCallback(event.streams[0]);
        }
      }
    };

    this.peerConnection.onicecandidate = event => {
      if (event.candidate) {
        this.signaling.send({ type: 'candidate', candidate: event.candidate, sessionId });
      }
    };

    // Connect WebSocket
    await this.signaling.connect();

    this.signaling.send({ type: 'join', sessionId });

    if (this.isInitiator) {
      setTimeout(() => this.createOffer(sessionId), 1000);
    }

    this.signaling.on('offer', async (data) => {
      await this.handleOffer(data.offer, sessionId);
    });

    this.signaling.on('answer', async (data) => {
      if (!this.peerConnection.currentRemoteDescription) {
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
        console.log('Answer set as remote description');
      }
    });

    this.signaling.on('candidate', async (data) => {
      try {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch (e) {
        console.error('ICE candidate Error', e);
      }
    });
  }

  private async createOffer(sessionId: string) {
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);
    this.signaling.send({ type: 'offer', offer, sessionId });
  }

  private async handleOffer(offer: RTCSessionDescriptionInit, sessionId: string) {
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    this.signaling.send({ type: 'answer', answer, sessionId });
  }

  disconnect() {
    this.peerConnection?.close();
    this.signaling.disconnect();
    this.localStream?.getTracks().forEach(track => track.stop());
  }
}
