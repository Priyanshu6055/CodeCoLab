import { useState, useEffect, useRef, useCallback } from 'react';
import ACTIONS from '../../Actions';
import toast from 'react-hot-toast';

const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' },
    ],
};

const useVoiceChat = (roomId, username, socketRef) => {
    const [isJoined, setIsJoined] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [voiceUsers, setVoiceUsers] = useState([]);
    const [error, setError] = useState(null);

    // Refs
    const localStreamRef = useRef(null);
    const connectionsRef = useRef({}); // { socketId: RTCPeerConnection }
    const audioElementsRef = useRef({}); // { socketId: HTMLAudioElement }

    // ── Helper: Create Audio Element ──
    const createAudioElement = (socketId) => {
        if (audioElementsRef.current[socketId]) return audioElementsRef.current[socketId];

        const audio = document.createElement('audio');
        audio.autoplay = true;
        audio.id = `audio-${socketId}`;
        audioElementsRef.current[socketId] = audio;
        return audio;
    };

    // ── Helper: Remove Audio Element ──
    const removeAudioElement = (socketId) => {
        const audio = audioElementsRef.current[socketId];
        if (audio) {
            audio.pause();
            audio.srcObject = null;
            audio.remove();
            delete audioElementsRef.current[socketId];
        }
    };

    // ── 1. Create Peer Connection ──
    const createPeerConnection = useCallback((targetSocketId, isInitiator) => {
        if (connectionsRef.current[targetSocketId]) {
            console.warn(`[Voice] PeerConnection already exists for ${targetSocketId}`);
            return connectionsRef.current[targetSocketId];
        }

        const pc = new RTCPeerConnection(ICE_SERVERS);
        connectionsRef.current[targetSocketId] = pc;

        // Handle ICE candidates
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                socketRef.current.emit(ACTIONS.VOICE_ICE, {
                    targetSocketId,
                    candidate: event.candidate,
                });
            }
        };

        // Handle Remote Tracks
        pc.ontrack = (event) => {
            const [remoteStream] = event.streams;
            const audio = createAudioElement(targetSocketId);
            if (audio.srcObject !== remoteStream) {
                audio.srcObject = remoteStream;
                audio.play().catch(err => console.warn('[Voice] Autoplay blocked:', err));
            }
        };

        // Add Local Tracks
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => {
                pc.addTrack(track, localStreamRef.current);
            });
        }

        return pc;
    }, [socketRef]);

    // ── 2. Socket Listeners ──
    useEffect(() => {
        const socket = socketRef.current;
        if (!socket) return;

        const handleVoiceUsers = async (users) => {
            console.log('[Voice] Current voice users:', users);
            setVoiceUsers(users);

            // Initiate connections to all existing users
            for (const user of users) {
                if (user.socketId === socket.id) continue;

                const pc = createPeerConnection(user.socketId, true);
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);

                socket.emit(ACTIONS.VOICE_OFFER, {
                    targetSocketId: user.socketId,
                    sdp: offer,
                });
            }
        };

        const handleVoiceOffer = async ({ sdp, callerSocketId }) => {
            const pc = createPeerConnection(callerSocketId, false);
            await pc.setRemoteDescription(new RTCSessionDescription(sdp));

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            socket.emit(ACTIONS.VOICE_ANSWER, {
                targetSocketId: callerSocketId,
                sdp: answer,
            });

            // Add caller to user list if not exists
            setVoiceUsers(prev => {
                if (!prev.find(u => u.socketId === callerSocketId)) {
                    return [...prev, { socketId: callerSocketId }];
                }
                return prev;
            });
        };

        const handleVoiceAnswer = async ({ sdp, responderSocketId }) => {
            const pc = connectionsRef.current[responderSocketId];
            if (pc) {
                await pc.setRemoteDescription(new RTCSessionDescription(sdp));
            }
        };

        const handleVoiceIce = async ({ candidate, senderSocketId }) => {
            const pc = connectionsRef.current[senderSocketId];
            if (pc) {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
            }
        };

        const handleVoiceJoined = ({ socketId, username }) => {
            toast.success(`${username} joined voice`);
            setVoiceUsers(prev => {
                if (!prev.find(u => u.socketId === socketId)) {
                    return [...prev, { socketId, username }];
                }
                return prev;
            });
        };

        const handleVoiceLeft = ({ socketId }) => {
            if (connectionsRef.current[socketId]) {
                connectionsRef.current[socketId].close();
                delete connectionsRef.current[socketId];
            }
            removeAudioElement(socketId);
            setVoiceUsers(prev => prev.filter(u => u.socketId !== socketId));
        };

        socket.on(ACTIONS.VOICE_USERS, handleVoiceUsers);
        socket.on(ACTIONS.VOICE_OFFER, handleVoiceOffer);
        socket.on(ACTIONS.VOICE_ANSWER, handleVoiceAnswer);
        socket.on(ACTIONS.VOICE_ICE, handleVoiceIce);
        socket.on(ACTIONS.VOICE_JOINED, handleVoiceJoined);
        socket.on(ACTIONS.VOICE_LEFT, handleVoiceLeft);

        return () => {
            socket.off(ACTIONS.VOICE_USERS, handleVoiceUsers);
            socket.off(ACTIONS.VOICE_OFFER, handleVoiceOffer);
            socket.off(ACTIONS.VOICE_ANSWER, handleVoiceAnswer);
            socket.off(ACTIONS.VOICE_ICE, handleVoiceIce);
            socket.off(ACTIONS.VOICE_JOINED, handleVoiceJoined);
            socket.off(ACTIONS.VOICE_LEFT, handleVoiceLeft);
        };
    }, [isJoined, createPeerConnection, socketRef]);

    // ── 3. Actions ──

    const joinVoice = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            localStreamRef.current = stream;
            setIsJoined(true);
            setIsMuted(false);

            // Notify server
            socketRef.current.emit(ACTIONS.VOICE_JOIN, { roomId, username });
        } catch (err) {
            console.error('[Voice] Failed to access microphone:', err);
            setError('Microphone access denied');
            toast.error('Could not access microphone');
        }
    };

    const leaveVoice = () => {
        // Stop local stream
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
            localStreamRef.current = null;
        }

        // Close all connections
        Object.values(connectionsRef.current).forEach(pc => pc.close());
        connectionsRef.current = {};

        // Remove audio elements
        Object.keys(audioElementsRef.current).forEach(socketId => removeAudioElement(socketId));
        audioElementsRef.current = {};

        // Notify server
        if (socketRef.current) {
            socketRef.current.emit(ACTIONS.VOICE_LEAVE);
        }

        setIsJoined(false);
        setVoiceUsers([]);
    };

    const toggleMute = () => {
        if (localStreamRef.current) {
            const audioTrack = localStreamRef.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMuted(!audioTrack.enabled);
            }
        }
    };

    return {
        isJoined,
        isMuted,
        voiceUsers,
        error,
        joinVoice,
        leaveVoice,
        toggleMute,
    };
};

export default useVoiceChat;
