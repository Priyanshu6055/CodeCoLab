import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const Login = () => {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!email || !password) {
            setError('All fields are required');
            return;
        }

        setIsSubmitting(true);
        try {
            await login(email, password);
            toast.success('Logged in successfully!');
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
                <h4 className="mainLabel">Login to CodeCoLab</h4>

                {error && <div className="errorBox">{error}</div>}

                <div className="inputGroup">
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
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyUp={handleKeyUp}
                    />
                    <button
                        className="btn joinBtn"
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Logging in...' : 'Login'}
                    </button>
                    <span className="createInfo">
                        Don't have an account? &nbsp;
                        <Link to="/signup" className="createNewBtn">
                            Sign up
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

export default Login;
