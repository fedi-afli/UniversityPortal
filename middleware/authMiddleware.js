const jwt = require('jsonwebtoken');
const { Student } = require('../models/Roles');

const authMiddleware = async (req, res, next) => {
  try {
    // 🔐 1. Check AI agent access first
    

    if (req.body?.['x-ai-pass'] && req.body['x-ai-pass'] === process.env.AI_PASS){
      console.log("[AUTH] AI agent authenticated");

      // Optional: attach a fake/system user
      s_id=await Student.findById(req.body.stduentId)
      
      req.user = await Student.findById(s_id)
      console.log(req.user)
      console.log(req.body.message)

      return next();
    }

    // 🔐 2. Normal JWT auth (users)
    const token = req.cookies?.jwt;


    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const student = await Student.findById(decoded.id);

    if (!student) {
      res.clearCookie('jwt');
      return res.redirect('/signin');
    }

    if (student.isBlocked) {
      res.clearCookie('jwt');
      return res.redirect('/signin');
    }

    req.user = student;
    next();

  } catch (err) {
    console.error("Auth error:", err.message);
    res.clearCookie('jwt');
    return res.redirect('/signin');
  }
};

module.exports = authMiddleware;