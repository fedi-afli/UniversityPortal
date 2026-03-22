const jwt = require('jsonwebtoken');
const { Student } = require('../models/Roles'); // updated import

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.cookies?.jwt;

    // ❌ No token → redirect to login
    if (!token) {
      return res.redirect('/signin');
    }

    // 🔐 Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 🔍 Get user by ID
    const student = await Student.findById(decoded.id);

    if (!student) {
      res.clearCookie('jwt');
      return res.redirect('/signin');
    }

    // 🚫 Blocked user
    if (student.isBlocked) {
      res.clearCookie('jwt');
      return res.redirect('/signin');
    }

    // ✅ OK, attach user to request
    req.user = student;
    next();

  } catch (err) {
    console.error("Auth error:", err.message);
    res.clearCookie('jwt');
    return res.redirect('/signin');
  }
};

module.exports = authMiddleware;