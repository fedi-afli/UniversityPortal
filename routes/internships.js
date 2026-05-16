
const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const router = express.Router();
router.get('/submission',authMiddleware, (req, res) => {

    res.render("internships",{user:req.user});


});
module.exports = router;