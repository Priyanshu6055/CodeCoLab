const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const WebSocket = require('ws');
const connectDB = require('./config/db');
const initSocket = require('./socket/socketHandler');
const { handleYjsConnection } = require('./socket/yjsHandler');

// Connect to MongoDB
connectDB();

const app = express();
const server = http.createServer(app);

// ── WebSocket Server Init (Yjs) ──
const wss = new WebSocket.Server({ noServer: true });
wss.on('connection', handleYjsConnection);

// ── Socket.IO Init (Voice/Signaling) ──
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
});

// Middleware
app.use(cors());
app.use(express.json());

// Health Check Endpoint (For Uptime Monitoring)
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// API routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/projects', require('./routes/projects'));

// Initialise Socket.IO handlers
initSocket(io);

// ── Unified WebSocket Routing ──
server.on('upgrade', (request, socket, head) => {
    const { pathname } = new URL(request.url, `http://${request.headers.host}`);

    if (pathname.startsWith('/yjs')) {
        wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit('connection', ws, request);
        });
    }
    // Note: Socket.IO handles its own upgrade requests automatically.
    // We don't destroy the socket here so that Socket.IO can process its paths.
});

// Serve React build in production
const clientBuildPath = path.join(__dirname, '..', 'client', 'build');
app.use(express.static(clientBuildPath));
app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Unified Server running on port ${PORT}`));

// ── Graceful Shutdown ──
const shutdown = () => {
    console.log('🛑 Shutting down server...');
    server.close(() => {
        console.log('HTTP/WS server closed.');
        process.exit(0);
    });

    // Forced shutdown after 10s
    setTimeout(() => {
        console.error('Forcing shutdown...');
        process.exit(1);
    }, 10000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
