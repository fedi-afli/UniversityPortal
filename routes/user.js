const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Etudiant = require('../models/Roles'); 

const auth = require('../middleware/auth');

router.get("/search/:nom", auth, async (req, res) => {
    try {
        const searchName = req.params.nom;

        // Recherche par nom ou prénom
        const etudiants = await Etudiant.find({
            $or: [
                { nom: { $regex: searchName, $options: "i" } },
                { prenom: { $regex: searchName, $options: "i" } }
            ]
        }).select("nom prenom profilePicture cin");

        res.status(200).json({ success: true, etudiants });
        
    } catch (error) {
        console.error("Erreur recherche étudiants:", error);
        res.status(500).json({ message: "Erreur serveur." });
    }
});

module.exports = router;