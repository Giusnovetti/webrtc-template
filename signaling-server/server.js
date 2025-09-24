import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 8080, host : '0.0.0.0' });


const sessions = new Map();

wss.on('connection', (ws) => {
    let sessionId;

    ws.on('message', (msg) => {
        const data = JSON.parse(msg.toString());
        console.log('Received message:', data)


        if (data.type === 'join') {
            sessionId = data.sessionId;
            if (!sessions.has(sessionId)) {
                sessions.set(sessionId, new Set());
            }
            sessions.get(sessionId).add(ws);
            console.log(`Client joined session on: ${sessionId}`);
            return;
        }


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
            console.log(`Client exiting from session: ${sessionId}`);
        }
    });
});

console.log('Signaling server UP!') ;
