const ACTIONS = {
    JOIN: 'join',
    JOINED: 'joined',
    DISCONNECTED: 'disconnected',
    CODE_CHANGE: 'code-change',
    SYNC_CODE: 'sync-code',
    LEAVE: 'leave',

    // Voice Chat Events
    VOICE_JOIN: 'voice:join',
    VOICE_JOINED: 'voice:joined',
    VOICE_USERS: 'voice:users',
    VOICE_OFFER: 'voice:offer',
    VOICE_ANSWER: 'voice:answer',
    VOICE_ICE: 'voice:ice',
    VOICE_LEAVE: 'voice:leave',
    VOICE_LEFT: 'voice:left',
};

module.exports = ACTIONS;
