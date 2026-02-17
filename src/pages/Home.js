import React, { useState } from 'react';
import { v4 as uuidV4 } from 'uuid';
import toast from 'react-hot-toast';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Home = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    const [roomId, setRoomId] = useState('');

    // Username comes from the logged-in user
    const username = user?.username || '';

    const createNewRoom = (e) => {
        e.preventDefault();
        const id = uuidV4();
        setRoomId(id);
        toast.success('Created a new room');
    };

    const joinRoom = () => {
        if (!roomId) {
            toast.error('ROOM ID is required');
            return;
        }

        // Redirect with username from auth
        navigate(`/editor/${roomId}`, {
            state: {
                username,
            },
        });
    };

    const handleInputEnter = (e) => {
        if (e.code === 'Enter') {
            joinRoom();
        }
    };

    const handleLogout = () => {
        logout();
        toast.success('Logged out successfully');
        navigate('/login');
    };

    return (
        <div className="homePageWrapper">
            <div className="formWrapper">
                <div className="homeHeader">
                    <img
                        className="homePageLogo"
                        src="/code-sync.png"
                        alt="code-sync-logo"
                    />
                    <div className="userInfo">
                        <span className="welcomeText">
                            Welcome, <strong>{username}</strong>
                        </span>
                        <div className="userActions">
                            <Link to="/projects" className="btn projectsNavBtn">
                                My Projects
                            </Link>
                            <button
                                className="btn logoutBtn"
                                onClick={handleLogout}
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
                <h4 className="mainLabel">Paste invitation ROOM ID</h4>
                <div className="inputGroup">
                    <input
                        type="text"
                        className="inputBox"
                        placeholder="ROOM ID"
                        onChange={(e) => setRoomId(e.target.value)}
                        value={roomId}
                        onKeyUp={handleInputEnter}
                    />
                    <button className="btn joinBtn" onClick={joinRoom}>
                        Join
                    </button>
                    <span className="createInfo">
                        If you don't have an invite then create &nbsp;
                        <a
                            onClick={createNewRoom}
                            href=""
                            className="createNewBtn"
                        >
                            new room
                        </a>
                    </span>
                </div>
            </div>
            <footer>
                <h4>
                    Built by &nbsp;
                    <a href="https://priyanshu-raj-website.vercel.app/">Priyanshu Raj</a>
                </h4>
            </footer>
        </div>
    );
};

export default Home;
