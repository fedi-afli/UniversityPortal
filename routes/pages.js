const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const Absence = require('../models/Absence');
const Enrollment = require('../models/Enrollment');
const bcrypt = require('bcryptjs');
const { Student } = require('../models/Roles');
router.get('/', authMiddleware, (req, res) => {
    res.render('main', { etudiant: req.user });
});

router.get('/profile', authMiddleware, async (req, res) => {
    try {
        const student = req.user;

        // Your attendance & semester calculation here...
        const absences = await Absence.find({ student: student._id });
        const unjustified = absences.filter(a => !a.isJustified).length;
        const total = absences.length || 1; // avoid division by zero
        const attendanceRate = ((total - unjustified) / total) * 100;

        const active = await Enrollment.findOne({
            student: student._id,
            status: 'active'
        });

        res.render('profile', {
            etudiant: {
                ...student.toObject(),
                attendanceRate: attendanceRate.toFixed(1),
                currentSemester: active ? `${active.semester} ${active.academicYear}` : 'None'
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// POST /profile → save changes (this was missing or not working)
router.post('/profile', authMiddleware, async (req, res) => {
    try {
        const { firstName, lastName, email } = req.body;
        const student = req.user;

        if (!firstName?.trim() || !lastName?.trim() || !email?.trim()) {
            return res.status(400).json({ success: false, error: 'All fields are required' });
        }

        // Optional: check email uniqueness if changed
        if (email !== student.email) {
            const exists = await Student.findOne({ email, _id: { $ne: student._id } });
            if (exists) {
                return res.status(400).json({ success: false, error: 'Email already used' });
            }
        }

        student.firstName = firstName.trim();
        student.lastName  = lastName.trim();
        student.email     = email.trim();

        await student.save();

        res.json({ success: true, message: 'Profile updated' });
    } catch (err) {
        console.error('Profile update error:', err);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// POST /profile/password → change password
router.post('/profile/password', authMiddleware, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const student = req.user;

        // Verify current password
        const isMatch = await bcrypt.compare(currentPassword, student.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, error: 'Current password is incorrect' });
        }

        // Validate new password
        if (!newPassword || newPassword.length < 8) {
            return res.status(400).json({ success: false, error: 'New password must be at least 8 characters' });
        }

        // Hash and update
        const salt = await bcrypt.genSalt(10);
        student.password = await bcrypt.hash(newPassword, salt);
        await student.save();

        res.json({ success: true, message: 'Password updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

router.get('/about', authMiddleware, (req, res) => {
    res.render('about', { etudiant: req.user });
});



module.exports = router;