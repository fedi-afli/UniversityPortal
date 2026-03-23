const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { Student } = require('../models/Roles');
const Enrollment = require('../models/Enrollment'); // your enrollment model
const { sendVerificationEmail } = require('./email');

// --- MULTER CONFIGURATION ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '..public/uploads/profile-pictures');
        if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(4).toString('hex');
        const ext = path.extname(file.originalname);
        cb(null, `profile-${uniqueSuffix}${ext}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('Only images are allowed!'), false);
    }
}).single('profilePicture');

// --- HELPERS ---
const sendOnce = (callback) => {
    try { callback(); } 
    catch (e) { if (e.code !== 'ERR_HTTP_HEADERS_SENT') console.error(e); }
};

const deleteFile = (filePath) => {
    fs.unlink(filePath, (err) => { if (err && err.code !== 'ENOENT') console.error(err); });
};

// --- SIGNUP ROUTE ---
router.post('/', upload, async (req, res) => {
    try {
        const { cin, nom, prenom, email, password } = req.body;

        // Basic validation
        if (!cin || !nom || !prenom || !email || !password) {
            if (req.file) deleteFile(req.file.path);
            return sendOnce(() => res.status(400).json({ message: 'Please fill all required fields.' }));
        }

        // Check for existing student account
        const existingStudent = await Student.findOne({ $or: [{ email }, { nationalId: cin }] });
        if (existingStudent) {
            if (req.file) deleteFile(req.file.path);
            return sendOnce(() => res.status(400).json({ message: 'An account with this CIN or email already exists.' }));
        }

        // Check if enrollment exists for this CIN
        const enrollment = await Enrollment.findOne({ nationalId: cin });
        if (!enrollment) {
            if (req.file) deleteFile(req.file.path);
            return sendOnce(() => res.status(400).json({ message: 'No university enrollment found for this CIN.' }));
        }

        // Ensure enrollment is not already linked to a student
        if (enrollment.student) {
            if (req.file) deleteFile(req.file.path);
            return sendOnce(() => res.status(400).json({ message: 'This enrollment is already linked to a student account.' }));
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // --- VERIFICATION TOKEN ---
        const verificationToken = crypto.randomBytes(32).toString('hex');

        // Profile picture
        const profilePicturePath = req.file 
            ? `/uploads/profile-pictures/${req.file.filename}` 
            : '/uploads/default-avatars/default.png';

        // Create student account
        const student = new Student({
            firstName: nom,
            lastName: prenom,
            email,
            password: hashedPassword,
            profilePicture: profilePicturePath,
            isVerified: false,
            nationalId: cin,
            inscrption: enrollment._id,
            verificationToken // ✅ store the token here
        });

        await student.save();

        // Link enrollment to student
        enrollment.student = student._id;
        await enrollment.save();

        // Send verification email
        const verifyURL = `${req.protocol}://${req.get('host')}/verify/${verificationToken}`;
        try {
            await sendVerificationEmail(email, verifyURL);
            return sendOnce(() => res.status(201).json({
                message: 'Account created successfully. Please check your email to verify your account.',
                profilePicture: profilePicturePath
            }));
        } catch (mailErr) {
            console.error('Email failed:', mailErr);
            await Student.deleteOne({ _id: student._id });
            if (req.file) deleteFile(req.file.path);
            return sendOnce(() => res.status(500).json({ message: 'Verification email could not be sent.' }));
        }

    } catch (err) {
        if (req.file) deleteFile(req.file.path);
        console.error(err);
        return sendOnce(() => res.status(500).json({ message: 'Internal server error.' }));
    }
});

module.exports = router;