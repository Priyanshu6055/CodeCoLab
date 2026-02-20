import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const Signup = () => {
    const navigate = useNavigate();
    const { register } = useAuth();
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!username || !email || !password) {
            setError('All fields are required');
            return;
        }

        if (username.length < 3) {
            setError('Username must be at least 3 characters');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setIsSubmitting(true);
        try {
            await register(username, email, password);
            toast.success('Account created successfully!');
            navigate('/');
        } catch (err) {
            setError(err.message);
            toast.error(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleKeyUp = (e) => {
        if (e.code === 'Enter') {
            handleSubmit(e);
        }
    };

    return (
        <div className="homePageWrapper">
            <div className="formWrapper">
                <img
                    className="homePageLogo"
                    src="/code-sync.png"
                    alt="code-sync-logo"
                />
                <h4 className="mainLabel">Create a CodeCoLab Account</h4>

                {error && <div className="errorBox">{error}</div>}

                <div className="inputGroup">
                    <input
                        type="text"
                        className="inputBox"
                        placeholder="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        onKeyUp={handleKeyUp}
                    />
                    <input
                        type="email"
                        className="inputBox"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onKeyUp={handleKeyUp}
                    />
                    <input
                        type="password"
                        className="inputBox"
                        placeholder="Password (min 6 characters)"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyUp={handleKeyUp}
                    />
                    <button
                        className="btn joinBtn"
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Creating...' : 'Sign Up'}
                    </button>
                    <span className="createInfo">
                        Already have an account? &nbsp;
                        <Link to="/login" className="createNewBtn">
                            Login
                        </Link>
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

export default Signup;
