const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Etudiant = require('../models/Roles'); 


const authMiddleware = require('../middleware/authMiddleware');

router.get("/", authMiddleware, async (req, res) => {
    res.render("absence")
});

module.exports = router;