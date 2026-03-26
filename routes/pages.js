const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const Absence = require('../models/Absence');
const Enrollment = require('../models/Enrollment');
const bcrypt = require('bcryptjs');
const { Student } = require('../models/Roles');

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// --- MULTER CONFIGURATION ---
// Set the physical upload directory to public/uploads/profile-pictures
const uploadDir = path.join('public', 'uploads', 'profile-pictures');

// Ensure the directory exists
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir); 
    },
    filename: function (req, file, cb) {
        // Create a unique filename: studentID-timestamp.extension
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, req.user._id + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// --- ROUTES ---

// Home / Dashboard
router.get('/', authMiddleware, (req, res) => {
    res.render('main', { user: req.user });
});

// GET Profile Page
router.get('/profile', authMiddleware, async (req, res) => {
    try {
        const student = req.user;

        const absences = await Absence.find({ student: student._id });
        const unjustified = absences.filter(a => !a.isJustified).length;
        const total = absences.length || 1;
        const attendanceRate = ((total - unjustified) / total) * 100;

        const active = await Enrollment.findOne({
            student: student._id,
            status: 'active'
        });

        res.render('profile', {
            user: {
                ...student.toObject(),                    
                attendanceRate: attendanceRate.toFixed(1),
                currentSemester: active 
                    ? `${active.semester} ${active.academicYear}` 
                    : 'No active semester'
            }
        });
    } catch (err) {
        console.error('Profile route error:', err);
        res.status(500).send('Server error');
    }
});

// POST Profile Page
router.post('/profile', authMiddleware, upload.single('profilePicture'), async (req, res) => {
    try {
        const { firstName, lastName, email } = req.body;

        const updateData = {
            firstName,
            lastName,
            email
        };

        // If a file was uploaded, format the web path for the database
        if (req.file) {
            // Since the file is physically in 'public/uploads/profile-pictures',
            // and 'public' is usually the static root, we only save the relative web path
            updateData.profilePicture = '/uploads/profile-pictures/' + req.file.filename;
        }

        await Student.findByIdAndUpdate(req.user._id, updateData, { new: true });

        res.json({ success: true, message: 'Profile updated successfully' });

    } catch (err) {
        console.error('Update profile error:', err);
        res.status(500).json({ success: false, error: 'Failed to update profile data.' });
    }
});

// About Page
router.get('/about', authMiddleware, (req, res) => {
    res.render('about', { user: req.user });
});

module.exports = router;