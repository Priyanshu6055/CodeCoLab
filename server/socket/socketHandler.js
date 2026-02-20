const ACTIONS = require('../constants/Actions');

// In-memory maps
const userSocketMap = {};
const voiceRooms = {}; // { roomId: [{ socketId, username }] }

function getAllConnectedClients(io, roomId) {
    return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map((socketId) => ({
        socketId,
        username: userSocketMap[socketId],
    }));
}

/**
 * Initialise all Socket.IO event handlers.
 * Call once after creating the io instance.
 */
function initSocket(io) {
    io.on('connection', (socket) => {
        // ── Editor Join ──
        socket.on(ACTIONS.JOIN, ({ roomId, username }) => {
            userSocketMap[socket.id] = username;
            socket.join(roomId);
            const clients = getAllConnectedClients(io, roomId);
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

            const existingUserIndex = voiceRooms[roomId].findIndex(u => u.socketId === socket.id);
            if (existingUserIndex !== -1) {
                voiceRooms[roomId][existingUserIndex] = { socketId: socket.id, username };
            } else {
                voiceRooms[roomId].push({ socketId: socket.id, username });
            }

            const otherUsers = voiceRooms[roomId].filter(u => u.socketId !== socket.id);
            socket.emit(ACTIONS.VOICE_USERS, otherUsers);

            otherUsers.forEach(user => {
                io.to(user.socketId).emit(ACTIONS.VOICE_JOINED, { socketId: socket.id, username });
            });
        });

        socket.on(ACTIONS.VOICE_OFFER, ({ targetSocketId, sdp }) => {
            io.to(targetSocketId).emit(ACTIONS.VOICE_OFFER, {
                sdp,
                callerSocketId: socket.id,
                callerUsername: userSocketMap[socket.id],
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
            for (const roomId in voiceRooms) {
                const users = voiceRooms[roomId];
                const index = users.findIndex(u => u.socketId === socket.id);
                if (index !== -1) {
                    users.splice(index, 1);

                    if (users.length === 0) {
                        delete voiceRooms[roomId];
                    } else {
                        users.forEach(u => {
                            io.to(u.socketId).emit(ACTIONS.VOICE_LEFT, { socketId: socket.id });
                        });
                    }
                    break;
                }
            }
        };

        socket.on(ACTIONS.VOICE_LEAVE, leaveVoice);

        // ── Disconnect ──
        socket.on('disconnecting', () => {
            const rooms = [...socket.rooms];
            rooms.forEach((roomId) => {
                socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
                    socketId: socket.id,
                    username: userSocketMap[socket.id],
                });
            });

            leaveVoice();
            delete userSocketMap[socket.id];
        });
    });
}

module.exports = initSocket;
