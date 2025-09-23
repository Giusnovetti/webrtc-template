import {AfterViewInit, Component, ElementRef, ViewChild} from '@angular/core';
import {WebrtcService} from '../webrtc/web-rtc-service';

@Component({
  selector: 'app-video-call',
  imports: [],
  template: `
    <div class="video-container">
      <h3>Video Locale</h3>
      <video #localVideo autoplay playsinline muted style="width: 300px; height: 200px; border: 1px solid black;"></video>

      <h3>Video Remoto</h3>
      <video #remoteVideo autoplay playsinline style="width: 300px; height: 200px; border: 1px solid red;"></video>

      <div>
        <button (click)="startAsInitiator()">Avvia come Iniziatore</button>
        <button (click)="startAsReceiver()">Avvia come Ricevitore</button>
        <button (click)="disconnect()">Disconnetti</button>
      </div>
    </div>`
  ,
  styleUrl: './video-call.css'
})
export class VideoCall implements AfterViewInit{

  @ViewChild('localVideo') localVideo!: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideo') remoteVideo!: ElementRef<HTMLVideoElement>;

  constructor(private webrtcService: WebrtcService) {}

  async ngAfterViewInit() {
  try {
    const stream = await this.webrtcService.initLocalStream();
    this.localVideo.nativeElement.srcObject = stream;
    this.localVideo.nativeElement.muted = true;
    console.log('✅ Stream locale impostato');

    this.webrtcService.onRemoteStream((remoteStream) => {
      console.log('🎬 Ricevuto stream remoto nel componente');
      console.log('📊 Tracce remote:', remoteStream.getTracks().length);

      if (this.remoteVideo?.nativeElement) {
        this.remoteVideo.nativeElement.srcObject = remoteStream;
        console.log('✅ Stream remoto assegnato al video element');

        // Aggiungi tutti gli eventi per debug
        this.remoteVideo.nativeElement.addEventListener('loadstart', () => {
          console.log('📺 Video: loadstart');
        });

        this.remoteVideo.nativeElement.addEventListener('loadeddata', () => {
          console.log('📺 Video: loadeddata');
        });

        this.remoteVideo.nativeElement.addEventListener('loadedmetadata', () => {
          console.log('📺 Video: loadedmetadata - dimensioni:',
            this.remoteVideo.nativeElement.videoWidth, 'x', this.remoteVideo.nativeElement.videoHeight);
        });

        this.remoteVideo.nativeElement.addEventListener('canplay', () => {
          console.log('📺 Video: canplay');
        });

        this.remoteVideo.nativeElement.addEventListener('playing', () => {
          console.log('▶️ Video: playing');
        });

        this.remoteVideo.nativeElement.addEventListener('pause', () => {
          console.log('⏸️ Video: pause');
        });

        this.remoteVideo.nativeElement.addEventListener('error', (e) => {
          console.error('❌ Video error:', e);
        });

        this.remoteVideo.nativeElement.addEventListener('stalled', () => {
          console.log('🚫 Video: stalled');
        });

        this.remoteVideo.nativeElement.addEventListener('waiting', () => {
          console.log('⏳ Video: waiting');
        });

        // Forza il play dopo un breve delay
        setTimeout(() => {
          console.log('🎯 Tentativo di forzare play del video remoto');
          this.remoteVideo.nativeElement.play().then(() => {
            console.log('✅ Video remoto avviato con successo');
          }).catch(e => {
            console.error('❌ Errore nel play del video remoto:', e);
            // Prova ad aggiungere controls per permettere il play manuale
            this.remoteVideo.nativeElement.setAttribute('controls', 'true');
          });
        }, 500);
      }
    });

    // Avvia la connessione automaticamente per test
    // this.webrtcService.startConnection(); // Commenta questa linea
  } catch (error) {
    console.error('❌ Errore nell\'inizializzazione:', error);
  }
}
  startAsInitiator() {
    this.webrtcService.startConnection('test-room', true);
  }

  startAsReceiver() {
    this.webrtcService.startConnection('test-room', false);
  }

  disconnect() {
    this.webrtcService.disconnect();
  }

}
