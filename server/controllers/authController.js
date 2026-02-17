const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Generate JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Validate required fields
        if (!username || !email || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // Validate password length
        if (password.length < 6) {
            return res
                .status(400)
                .json({ message: 'Password must be at least 6 characters' });
        }

        // Check if email already exists
        const emailExists = await User.findOne({ email });
        if (emailExists) {
            return res
                .status(400)
                .json({ message: 'An account with this email already exists' });
        }

        // Check if username already exists
        const usernameExists = await User.findOne({ username });
        if (usernameExists) {
            return res
                .status(400)
                .json({ message: 'This username is already taken' });
        }

        const user = await User.create({ username, email, password });

        res.status(201).json({
            _id: user._id,
            username: user.username,
            email: user.email,
            token: generateToken(user._id),
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ message: 'Server error during registration' });
    }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res
                .status(400)
                .json({ message: 'Email and password are required' });
        }

        // Find user and include password field for comparison
        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        res.status(200).json({
            _id: user._id,
            username: user.username,
            email: user.email,
            token: generateToken(user._id),
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error during login' });
    }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
    try {
        res.status(200).json({
            _id: req.user._id,
            username: req.user.username,
            email: req.user.email,
        });
    } catch (error) {
        console.error('GetMe error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { register, login, getMe };
