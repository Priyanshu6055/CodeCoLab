const { setupWSConnection } = require('y-websocket/bin/utils');

/**
 * Handle Yjs WebSocket connections.
 * @param {WebSocket} conn 
 * @param {http.IncomingMessage} req 
 */
const handleYjsConnection = (conn, req) => {
    const ip = req.socket.remoteAddress;
    console.log(`🔌 [YJS] New client connected from ${ip} (URL: ${req.url})`);

    // Safely log incoming messages (don't override conn.send)
    conn.on('message', (msg) => {
        try {
            const messageStr = msg.toString();
            // Log only first 100 chars to avoid flooding logs
            console.log(`📥 [YJS] Message from ${ip}:`, messageStr.slice(0, 100));
        } catch (err) {
            console.error('❌ [YJS] Error parsing incoming message', err);
        }
    });

    conn.on('close', () => {
        console.log(`🔌 [YJS] Client disconnected from ${ip}`);
    });

    // Setup Yjs WebSocket connection
    setupWSConnection(conn, req);
};

module.exports = { handleYjsConnection };
