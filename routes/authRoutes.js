const express = require('express');
const User = require('../models/userModel');
const router = express.Router();

const sendTokenResponse = (user, statusCode, res) => {
    const token = user.getSignedJwtToken();
    res.status(statusCode).json({
        success: true,
        token: token,
        user: {
            id: user._id,
            username: user.username,
            email: user.email
        }
    });
};

router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const user = await User.create({
            username,
            email,
            password
        });
        sendTokenResponse(user, 201, res);
    } catch (err) {
        console.error("Registration Error:", err.message);
        res.status(400).json({ success: false, error: err.message });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'Kripya email aur password daalein' });
        }
        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }
        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }
        sendTokenResponse(user, 200, res);
    } catch (err) {
        console.error("Login Error:", err.message);
        res.status(500).json({ success: false, error: 'Server error during login' });
    }
});

const jwt = require('jsonwebtoken');
exports.jwtVerify = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key_from_env');
    } catch (err) {
        return null;
    }
};

module.exports = router;
