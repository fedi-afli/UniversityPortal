const jwt = require('jsonwebtoken');
const { Student } = require('../models/Roles');

const authMiddleware = async (req, res, next) => {
    try {
        // 🤖 1. AI Agent Authentication
        const aiPass = req.headers['x-ai-pass'];
        if (aiPass && aiPass === process.env.AI_PASS) {
            console.log("[AUTH] AI agent authenticated");

            const targetStudentId = req.headers['x-student-id'] || req.body?.studentId;

            if (!targetStudentId) {
                return res.status(400).json({ status: 'error', reason: 'Missing student ID for AI operation' });
            }

            const student = await Student.findById(targetStudentId);

            if (!student) {
                return res.status(404).json({ status: 'error', reason: 'Target student not found' });
            }

            req.user = student;
            return next();
        }

        // 🧑‍🎓 2. Normal Web User (JWT) Authentication
        const token = req.cookies?.jwt;

        if (!token) {
            return handleAuthFailure(req, res, next);
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const student = await Student.findById(decoded.id);

        if (!student || student.isBlocked) {
            return handleAuthFailure(req, res, next);
        }

        req.user = student;
        return next();

    } catch (err) {
        console.error("[AUTH ERROR]:", err.message);
        return handleAuthFailure(req, res, next);
    }
};

/**
 * Enhanced failure handler that allows public pages to load without a token
 */
function handleAuthFailure(req, res, next) {
    res.clearCookie('jwt');

    // 1. If it's a critical API endpoint or an AJAX request, block it strictly with a 401
    if (req.originalUrl.startsWith('/api') || req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(401).json({ success: false, reason: 'Unauthorized access' });
    }

    // 2. If it's the main homepage, DO NOT redirect! Just let them pass as a guest.
    if (req.originalUrl === '/') {
        req.user = null; // Ensure user is explicitly null for the EJS file
        return next();   // Move to the next route handler peacefully
    }

    // 3. If it's any other protected page web route (like /profile), redirect them to signin
    return res.redirect('/signin');
}

module.exports = authMiddleware;