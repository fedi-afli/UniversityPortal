const jwt = require('jsonwebtoken');
const Etudiant = require('../models/Etudiant');

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.cookies?.jwt;

    // ❌ No token → redirect
    if (!token) {
      return res.redirect('/signin');
    }

    // 🔐 Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 🔍 Get user
    const user = await Etudiant.findById(decoded.id);

    if (!user) {
      res.clearCookie('jwt');
      return res.redirect('/signin');
    }

    // 🚫 Blocked user
    if (user.isBlocked) {
      res.clearCookie('jwt');
      return res.redirect('/signin');
    }

    // ✅ OK
    req.user = user;
    next();

  } catch (err) {
    console.log("Auth error:", err.message);

    res.clearCookie('jwt');
    return res.redirect('/signin');
  }
};

module.exports = authMiddleware;