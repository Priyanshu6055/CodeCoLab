import React from 'react';

/**
 * ActiveUsers — shows a list of connected users with typing/idle status.
 * Displayed in the editor sidebar.
 *
 * Props:
 *   users: Array<{ clientId, name, color, isTyping, isLocal }>
 */
const ActiveUsers = ({ users }) => {
    if (!users || users.length === 0) return null;

    return (
        <div className="activeUsersList">
            <div className="activeUsersTitle">Active Users ({users.length})</div>
            {users.map((user) => (
                <div
                    key={user.clientId}
                    className={`activeUserItem ${user.isLocal ? 'isLocal' : ''}`}
                >
                    <span
                        className={`activeUserDot ${user.isTyping ? 'typing' : ''}`}
                        style={{ background: user.color }}
                    />
                    <span className="activeUserName">
                        {user.name}
                        {user.isLocal ? ' (you)' : ''}
                    </span>
                    <span
                        className={`activeUserStatus ${user.isTyping ? 'typing' : 'idle'}`}
                    >
                        {user.isTyping ? 'typing' : 'idle'}
                    </span>
                </div>
            ))}
        </div>
    );
};

export default ActiveUsers;
