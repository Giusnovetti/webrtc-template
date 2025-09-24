import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SignalingService {

  private socket!: WebSocket;
  private listeners: { [key: string]: ((data: any) => void)[] } = {};

  connect(url: string = 'ws://localhost:8080/ws/'): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = new WebSocket(url);

      this.socket.onopen = () => {
        console.log('Connected to the signaling server');
        resolve();
      };

      this.socket.onerror = (error) => {
        console.error('Signaling server connection error', error);
        reject(error);
      };

      this.socket.onclose = () => {
        console.log('WebSocket connection closed');
      };

      this.socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        this.emit(data.type, data);
      };
    });
  }

  send(message: any) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    } else {
      console.error('Websocket not open.');
    }
  }

  on(type: string, callback: (data: any) => void) {
    if (!this.listeners[type]) {
      this.listeners[type] = [];
    }
    this.listeners[type].push(callback);
  }

  private emit(type: string, data: any) {
    if (this.listeners[type]) {
      this.listeners[type].forEach(cb => cb(data));
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
    }
  }

}