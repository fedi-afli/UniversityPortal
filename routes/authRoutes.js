const express = require('express');
const jwt = require('jsonwebtoken');
const Etudiant = require('../models/Roles');
const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { cin } = req.body; 
    
    const etudiant = await Etudiant.findOne({ cin });
    if (!etudiant) {
      return res.status(404).json({ error: 'Étudiant non trouvé' });
    }

    const token = jwt.sign(
      { id: etudiant._id, matricule: etudiant.numero_inscription }, 
      process.env.JWT_SECRET, 
      { expiresIn: '2h' }
    );

    res.json({ message: 'Connexion réussie', token, etudiant });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;