import { io } from 'socket.io-client';

export const initSocket = async () => {
    const options = {
        'force new connection': true,
        reconnectionAttempts: Infinity,
        timeout: 10000,
        transports: ['websocket'],
    };

    const backendUrl =
        process.env.NODE_ENV === 'development'
            ? 'http://localhost:5000'  // Local backend URL
            : window.location.origin;  // Use the deployed backend URL

    return io(backendUrl, options);
};
