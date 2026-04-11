const jwt = require('jsonwebtoken');
const { Student } = require('../models/Roles');

const authMiddleware = async (req, res, next) => {
  try {
    // 🤖 1. AI Agent Authentication
    // Upgraded to check Headers first (best practice), with a fallback to the Body
    const aiPass = req.headers['x-ai-pass'] 
    if (aiPass && aiPass === process.env.AI_PASS) {
      console.log("[AUTH] AI agent authenticated");

      // Check Headers first, fallback to Body (and fixed the 'stduentId' typo)
      const targetStudentId = req.headers['x-student-id'] || req.body?.studentId;
      
      if (!targetStudentId) {
          return res.status(400).json({ status: 'error', reason: 'Missing student ID for AI operation' });
      }

      // Query the database exactly once
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
        return handleAuthFailure(req, res);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const student = await Student.findById(decoded.id);

    if (!student || student.isBlocked) {
        return handleAuthFailure(req, res);
    }

    req.user = student;
    return next();

  } catch (err) {
    console.error("[AUTH ERROR]:", err.message);
    return handleAuthFailure(req, res);
  }
};

/**
 * Helper function to send the correct response type.
 * Browsers get redirected, APIs/Agents get a JSON error.
 */
function handleAuthFailure(req, res) {
    res.clearCookie('jwt');
    
    // If the route starts with /api or is an AJAX request, send JSON
    if (req.originalUrl.startsWith('/api') || req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(401).json({ success: false, reason: 'Unauthorized access' });
    }
    
    // Otherwise, redirect the web user to the login page
    return res.redirect('/signin');
}

module.exports = authMiddleware;