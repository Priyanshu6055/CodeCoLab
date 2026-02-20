import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext(null);

// API base URL — in dev, CRA proxies to localhost:5000 via package.json proxy,
// alternatively just hit the backend directly.
const API_URL =
    process.env.NODE_ENV === 'development'
        ? 'http://localhost:5000/api/auth'
        : '/api/auth';

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);

    // Restore user from token on app load
    useEffect(() => {
        const initAuth = async () => {
            const storedToken = localStorage.getItem('token');
            if (!storedToken) {
                setLoading(false);
                return;
            }

            try {
                const res = await fetch(`${API_URL}/me`, {
                    headers: { Authorization: `Bearer ${storedToken}` },
                });

                if (res.ok) {
                    const data = await res.json();
                    setUser(data);
                    setToken(storedToken);
                } else {
                    // Token expired or invalid
                    localStorage.removeItem('token');
                    setToken(null);
                    setUser(null);
                }
            } catch (error) {
                console.error('Auth init error:', error);
                localStorage.removeItem('token');
                setToken(null);
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        initAuth();
    }, []);

    const login = async (email, password) => {
        const res = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.message || 'Login failed');
        }

        localStorage.setItem('token', data.token);
        setToken(data.token);
        setUser({ _id: data._id, username: data.username, email: data.email });
        return data;
    };

    const register = async (username, email, password) => {
        const res = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password }),
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.message || 'Registration failed');
        }

        localStorage.setItem('token', data.token);
        setToken(data.token);
        setUser({ _id: data._id, username: data.username, email: data.email });
        return data;
    };

    const logout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                loading,
                isAuthenticated: !!user && !!token,
                login,
                register,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export default AuthContext;
