require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const ACTIONS = require('./src/Actions');
const connectDB = require('./server/config/db');

// Connect to MongoDB
connectDB();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
});

// CORS + Body parser middleware
app.use(cors());
app.use(express.json());

// API routes
app.use('/api/auth', require('./server/routes/auth'));
app.use('/api/projects', require('./server/routes/projects'));

// Serve static files in production
app.use(express.static(path.join(__dirname, 'build')));
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Default user mapping for editor
const userSocketMap = {};

// Voice rooms: { roomId: [{ socketId, username }] }
const voiceRooms = {};

function getAllConnectedClients(roomId) {
    return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map((socketId) => ({
        socketId,
        username: userSocketMap[socketId],
    }));
}

io.on('connection', (socket) => {
    // console.log('Socket connected:', socket.id);

    // ── Editor Join ──
    socket.on(ACTIONS.JOIN, ({ roomId, username }) => {
        userSocketMap[socket.id] = username;
        socket.join(roomId);
        const clients = getAllConnectedClients(roomId);
        clients.forEach(({ socketId }) => {
            io.to(socketId).emit(ACTIONS.JOINED, {
                clients,
                username,
                socketId: socket.id,
            });
        });
    });

    // ── Code Sync ──
    socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code }) => {
        socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { code });
    });

    socket.on(ACTIONS.SYNC_CODE, ({ socketId, code }) => {
        io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
    });

    // ── Voice Chat Signaling ──
    socket.on(ACTIONS.VOICE_JOIN, ({ roomId, username }) => {
        if (!voiceRooms[roomId]) {
            voiceRooms[roomId] = [];
        }

        // Check if user is already in voice room to avoid duplicates
        const existingUserIndex = voiceRooms[roomId].findIndex(u => u.socketId === socket.id);
        if (existingUserIndex !== -1) {
            voiceRooms[roomId][existingUserIndex] = { socketId: socket.id, username };
        } else {
            voiceRooms[roomId].push({ socketId: socket.id, username });
        }

        // Send list of existing users to the new joiner (so they can initiate offers)
        // We filter out the joiner themselves
        const otherUsers = voiceRooms[roomId].filter(u => u.socketId !== socket.id);
        socket.emit(ACTIONS.VOICE_USERS, otherUsers); // Send to self

        // Notify others that someone joined (optional, but good for UI)
        otherUsers.forEach(user => {
            io.to(user.socketId).emit(ACTIONS.VOICE_JOINED, { socketId: socket.id, username });
        });
    });

    socket.on(ACTIONS.VOICE_OFFER, ({ targetSocketId, sdp }) => {
        io.to(targetSocketId).emit(ACTIONS.VOICE_OFFER, {
            sdp,
            callerSocketId: socket.id,
            callerUsername: userSocketMap[socket.id] // fallback if needed
        });
    });

    socket.on(ACTIONS.VOICE_ANSWER, ({ targetSocketId, sdp }) => {
        io.to(targetSocketId).emit(ACTIONS.VOICE_ANSWER, {
            sdp,
            responderSocketId: socket.id,
        });
    });

    socket.on(ACTIONS.VOICE_ICE, ({ targetSocketId, candidate }) => {
        io.to(targetSocketId).emit(ACTIONS.VOICE_ICE, {
            candidate,
            senderSocketId: socket.id,
        });
    });

    const leaveVoice = () => {
        // Find which room this socket is in for voice
        for (const roomId in voiceRooms) {
            const users = voiceRooms[roomId];
            const index = users.findIndex(u => u.socketId === socket.id);
            if (index !== -1) {
                const user = users[index];
                users.splice(index, 1);

                // Cleanup empty rooms
                if (users.length === 0) {
                    delete voiceRooms[roomId];
                } else {
                    // Notify others
                    users.forEach(u => {
                        io.to(u.socketId).emit(ACTIONS.VOICE_LEFT, { socketId: socket.id });
                    });
                }
                break; // User can only be in one voice room at a time
            }
        }
    };

    socket.on(ACTIONS.VOICE_LEAVE, leaveVoice);

    // ── Disconnect ──
    socket.on('disconnecting', () => {
        // Handle Editor Disconnect
        const rooms = [...socket.rooms];
        rooms.forEach((roomId) => {
            socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
                socketId: socket.id,
                username: userSocketMap[socket.id],
            });
        });

        // Handle Voice Disconnect
        leaveVoice();

        delete userSocketMap[socket.id];
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
