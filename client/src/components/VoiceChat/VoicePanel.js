import React, { useState } from 'react';
import useVoiceChat from './useVoiceChat';
import { MdVoiceChat, MdMic, MdMicOff, MdCallEnd } from 'react-icons/md';
import './VoicePanel.css';

const VoicePanel = ({ roomId, username, socketRef }) => {
    const {
        isJoined,
        isMuted,
        voiceUsers,
        joinVoice,
        leaveVoice,
        toggleMute,
    } = useVoiceChat(roomId, username, socketRef);

    const [isExpanded, setIsExpanded] = useState(false);

    // If not joined, show a small invite button
    if (!isJoined) {
        return (
            <div className="voicePanel collapsed">
                <button
                    className="btn iconBtn"
                    onClick={joinVoice}
                    title="Join Voice Chat"
                >
                    <MdVoiceChat size={20} color="#4aed88" />
                    <span style={{ color: '#4aed88' }}>Join Voice</span>
                </button>
            </div>
        );
    }

    return (
        <div className={`voicePanel ${isExpanded ? 'expanded' : ''}`}>
            <div className="voiceControls">
                <div className="voiceStatus">
                    <span className="liveDot pulse-animation"></span>
                    <span
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="voiceLabel"
                        role="button"
                    >
                        {voiceUsers.length} in Voice {isExpanded ? '▼' : '▲'}
                    </span>
                </div>

                <div className="voiceActions">
                    <button
                        className={`btn-icon ${isMuted ? 'muted' : ''}`}
                        onClick={toggleMute}
                        title={isMuted ? 'Unmute' : 'Mute'}
                    >
                        {isMuted ? <MdMicOff size={18} /> : <MdMic size={18} />}
                    </button>
                    <button
                        className="btn-icon leave"
                        onClick={leaveVoice}
                        title="Leave Voice"
                    >
                        <MdCallEnd size={18} />
                    </button>
                </div>
            </div>

            {isExpanded && (
                <div className="voiceUserList">
                    {voiceUsers.map((user) => (
                        <div key={user.socketId} className="voiceUser">
                            <div
                                className="userAvatar"
                                style={{ background: '#6c63ff' }}
                                title={user.username}
                            >
                                {user.username ? user.username[0].toUpperCase() : '?'}
                            </div>
                            <span className="userName">
                                {user.username === username ? `${user.username} (You)` : user.username}
                            </span>
                        </div>
                    ))}
                    {voiceUsers.length === 0 && (
                        <div className="noUsers">Waiting for others...</div>
                    )}
                </div>
            )}
        </div>
    );
};

export default VoicePanel;
