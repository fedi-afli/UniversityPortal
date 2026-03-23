const express = require('express');
const router = express.Router();
const { Student } = require('../models/Roles');
const bcrypt = require('bcryptjs'); 
const jwt = require('jsonwebtoken');

router.get("/", (req, res) => {
    res.render("login", { message: "" });
});

router.post('/', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Find student by email
        const student = await Student.findOne({ email });

        if (!student) 
            return res.status(401).json({ message: 'Invalid credentials or user not registered' });

        // Check password
        const isMatch = await bcrypt.compare(password, student.password);
        if (!isMatch) 
            return res.status(401).json({ message: 'Invalid credentials' });

        // Check email verification
        if (!student.isVerified)
            return res.status(403).json({ message: 'Please verify your email first' });

        // Check if account is blocked
        if (student.isBlocked)
            return res.status(403).json({ message: 'Your account has been suspended by an admin.' });

        // Generate JWT
        const token = jwt.sign(
            { id: student._id, email: student.email, role: student.role }, // include role
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        // Set cookie
        res.cookie('jwt', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 3600000, // 1 hour
            sameSite: 'strict',
        });

        // Send success response
        return res.status(200).json({ 
            success: true, 
            message: 'Login successful', 
            redirectUrl: '/' 
        });    

    } catch (error) {
        console.error("Signin Error:", error);
        return res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;