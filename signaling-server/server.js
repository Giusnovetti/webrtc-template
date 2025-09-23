import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 8080, host : '0.0.0.0' });

// Map<sessionId, Set<WebSocket>>
const sessions = new Map();

wss.on('connection', (ws) => {
    let sessionId;

    ws.on('message', (msg) => {
        const data = JSON.parse(msg.toString());
        console.log('Received message:', data)

        // JOIN: il client entra in una sessione
        if (data.type === 'join') {
            sessionId = data.sessionId;
            if (!sessions.has(sessionId)) {
                sessions.set(sessionId, new Set());
            }
            sessions.get(sessionId).add(ws);
            console.log(`Client entrato in sessione: ${sessionId}`);
            return;
        }

        // OFFER / ANSWER / CANDIDATE → inoltra agli altri peer della sessione
        if (['offer', 'answer', 'candidate'].includes(data.type)) {
            const peers = sessions.get(sessionId);
            if (peers) {
                peers.forEach((peer) => {
                    if (peer !== ws && peer.readyState === ws.OPEN) {
                        peer.send(JSON.stringify(data));
                    }
                });
            }
        }
    });

    ws.on('close', () => {
        if (sessionId && sessions.has(sessionId)) {
            sessions.get(sessionId).delete(ws);
            if (sessions.get(sessionId).size === 0) {
                sessions.delete(sessionId);
            }
            console.log(`Client uscito da sessione: ${sessionId}`);
        }
    });
});

console.log('🚀 Signaling server WebSocket in ascolto su ws://0.0.0.0:8080');
