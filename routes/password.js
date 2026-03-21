const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const Etudiant = require('../models/Etudiant');
const { sendPasswordResetEmail } = require('./email');


router.get('/forgot', (req, res) => {
    return res.render('forgot_password');
});

router.post('/forgot', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).render('forgot_password', { error: 'Please provide your email.' });

    try {
        const user = await Etudiant.findOne({ email });
        if (!user) return res.status(200).render('forgot_password', { message: 'If that email exists, a reset link has been sent.' });

        const token = crypto.randomBytes(32).toString('hex');
        user.passwordChangeToken = token;
        user.passwordChangeExpires = Date.now() + 3600000; // 1 hour
        await user.save();

        const resetURL = `${req.protocol}://${req.get('host')}/password/reset/${token}`;
        await sendPasswordResetEmail(user.email, resetURL);

        return res.render('forgot_password', { message: 'If that email exists, a reset link has been sent.' });
    } catch (err) {
        console.error('Forgot password error:', err);
        return res.status(500).render('forgot_password', { error: 'Server error.' });
    }
});

// Render reset form
router.get('/reset/:token', async (req, res) => {
    const { token } = req.params;
    try {
        const user = await Etudiant.findOne({ passwordChangeToken: token, passwordChangeExpires: { $gt: Date.now() } });
        if (!user) return res.status(400).render('forgot_password', { error: 'Invalid or expired token.' });
        return res.render('reset_password', { token });
    } catch (err) {
        console.error('Reset GET error:', err);
        return res.status(500).render('forgot_password', { error: 'Server error.' });
    }
});

// Handle reset submission
router.post('/reset/:token', async (req, res) => {
    const { token } = req.params;
    const {  password, confirmPassword } = req.body;

    // 1. Basic validation
    if (!password || !confirmPassword || password !== confirmPassword) {
        return res.status(400).render('reset_password', { token, error: 'New passwords must match.' });
    }

    try {
        // 2. Find user by token and ensure it hasn't expired
        const user = await Etudiant.findOne({ 
            passwordChangeToken: token, 
            passwordChangeExpires: { $gt: Date.now() } 
        });

        if (!user) {
            return res.status(400).render('forgot_password', { error: 'Invalid or expired token.' });
        }

        
        
        

        // 4. Hash new password and clear token fields
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        user.passwordChangeToken = undefined;
        user.passwordChangeExpires = undefined;
        
        await user.save();

        return res.render('reset_password', { token: null, message: 'Password updated successfully. You can now sign in.' });
    } catch (err) {
        console.error('Reset POST error:', err);
        return res.status(500).render('reset_password', { token, error: 'Server error.' });
    }
});
module.exports = router;