import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class WebrtcService {
  private peerConnection!: RTCPeerConnection;
  private localStream!: MediaStream;
  private remoteStream!: MediaStream;
  private socket!: WebSocket;
  private remoteStreamCallback?: (stream: MediaStream) => void;
  private isInitiator = false; // Aggiungi questo flag

  async initLocalStream(): Promise<MediaStream> {
    this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    return this.localStream;
  }

  onRemoteStream(callback: (stream: MediaStream) => void) {
    this.remoteStreamCallback = callback;
  }

  startConnection(sessionId: string = 'test-room', initiator: boolean = false) {
    this.isInitiator = initiator;

    // 1. Crea peer connection con STUN/TURN
    this.peerConnection = new RTCPeerConnection({
      iceServers:  [
      {
        urls: "stun:stun.relay.metered.ca:80",
      },
      {
        urls: "turn:standard.relay.metered.ca:80",
        username: "df63269602a9febe9f3a55c2",
        credential: "nXeKUhlW+zGVeINK",
      },
      {
        urls: "turn:standard.relay.metered.ca:80?transport=tcp",
        username: "df63269602a9febe9f3a55c2",
        credential: "nXeKUhlW+zGVeINK",
      },
      {
        urls: "turn:standard.relay.metered.ca:443",
        username: "df63269602a9febe9f3a55c2",
        credential: "nXeKUhlW+zGVeINK",
      },
      {
        urls: "turns:standard.relay.metered.ca:443?transport=tcp",
        username: "df63269602a9febe9f3a55c2",
        credential: "nXeKUhlW+zGVeINK",
      },
  ]
    });

    // 2. Aggiungi tracce locali
    this.localStream.getTracks().forEach(track => {
      this.peerConnection.addTrack(track, this.localStream);
    });

    // 3. Gestisci tracce remote - VERSIONE CORRETTA
    this.remoteStream = new MediaStream();
    this.peerConnection.ontrack = event => {
      console.log('🎥 Evento ontrack ricevuto:', event.streams.length, 'streams');

      // Metodo più robusto per gestire le tracce remote
      if (event.streams && event.streams.length > 0) {
        // Usa direttamente il primo stream ricevuto
        const remoteStream = event.streams[0];
        console.log('📺 Stream remoto ricevuto con', remoteStream.getTracks().length, 'tracce');

        // Verifica che le tracce siano attive
        remoteStream.getTracks().forEach(track => {
          console.log(`📡 Traccia ${track.kind}: ${track.readyState}, enabled: ${track.enabled}`);
        });




        if (this.remoteStreamCallback) {
          this.remoteStreamCallback(remoteStream);
        }
      } else {
        // Fallback: aggiungi le tracce manualmente
        console.log('📡 Aggiungendo tracce manualmente...');
        event.track.onunmute = () => {
          console.log('🔊 Traccia unmuted:', event.track.kind);
          if (!this.remoteStream.getTrackById(event.track.id)) {
            this.remoteStream.addTrack(event.track);
            if (this.remoteStreamCallback) {
              this.remoteStreamCallback(this.remoteStream);
            }
          }
        };
      }
    };





    // 4. ICE candidates → inviati via WebSocket
    this.peerConnection.onicecandidate = event => {
      if (event.candidate) {
        console.log('Inviando ICE candidate');
        this.sendMessage({
          type: 'candidate',
          candidate: event.candidate,
          sessionId
        });
      }
    };

    // Monitoraggio dello stato della connessione
    this.peerConnection.onconnectionstatechange = () => {
      console.log('Stato connessione:', this.peerConnection.connectionState);
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      console.log('Stato ICE:', this.peerConnection.iceConnectionState);
    };

    // 5. Connessione WebSocket al signaling server
    this.socket = new WebSocket('ws://localhost:8080/ws/');

    this.socket.onopen = () => {
      console.log('WebSocket connesso');
      this.sendMessage({ type: 'join', sessionId });

      // Se siamo l'iniziatore, creiamo l'offerta dopo aver joinato
      if (this.isInitiator) {
        setTimeout(() => this.createOffer(sessionId), 1000);
      }
    };

    // 6. Gestione messaggi signaling
    this.socket.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      console.log('Messaggio ricevuto:', data.type);

      if (data.sessionId !== sessionId) return;

      switch (data.type) {
        case 'offer':
          await this.handleOffer(data.offer, sessionId);
          break;

        case 'answer':
          if (!this.peerConnection.currentRemoteDescription) {
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
            console.log('Answer ricevuta e impostata');
          }
          break;

        case 'candidate':
          try {
            await this.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
            console.log('ICE candidate aggiunto');
          } catch (e) {
            console.error('Errore ICE candidate:', e);
          }
          break;
      }
    };

    this.socket.onerror = (error) => {
      console.error('Errore WebSocket:', error);
    };

    this.socket.onclose = () => {
      console.log('WebSocket chiuso');
    };
  }

  // Nuovo metodo per creare un'offerta
  private async createOffer(sessionId: string) {
    try {
      console.log('Creando offerta...');
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      this.sendMessage({
        type: 'offer',
        offer,
        sessionId
      });
      console.log('Offerta inviata');
    } catch (error) {
      console.error('Errore nella creazione dell\'offerta:', error);
    }
  }

  private async handleOffer(offer: RTCSessionDescriptionInit, sessionId: string) {
    if (!this.peerConnection) {
      throw new Error('PeerConnection non inizializzata');
    }

    console.log('Gestendo offerta ricevuta...');
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);

    this.sendMessage({
      type: 'answer',
      answer,
      sessionId
    });
    console.log('Answer inviata');
  }

  private sendMessage(msg: any) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(msg));
    } else {
      console.error('WebSocket non aperto, stato:', this.socket?.readyState);
    }
  }

  // Metodo per chiudere la connessione
  disconnect() {
    if (this.peerConnection) {
      this.peerConnection.close();
    }
    if (this.socket) {
      this.socket.close();
    }
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
    }
  }
}
