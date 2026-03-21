const express = require('express');
const router = express.Router();
const Etudiant = require('../models/Etudiant');
const path = require('path');


async function sendVerificationPage(res, filename) {
    try {
        res.status(200).render('verification_pages/' + filename);
    } catch (error) {
        console.error("Error rendering verification page:", error);
        res.status(500).send('<h1>Server Error: Page Not Found</h1>');
    }
}

router.get('/:token', async (req, res) => {
    try {
        const etudiant = await Etudiant.findOne({ verificationToken: req.params.token });

        if (!etudiant) {
            return res.status(400).send('<h2 style="color:red; text-align:center;">Lien de vérification invalide ou expiré.</h2>'); 
        }

        // Valider le compte
        etudiant.isVerified = true;
        etudiant.verificationToken = undefined;
        await etudiant.save();

        // Renvoyer vers le portail
        return res.status(200).send(`
            <div style="text-align:center; font-family:sans-serif; margin-top:50px;">
                <h2 style="color:green;">✅ Votre compte étudiant a été vérifié avec succès !</h2>
                <p>Vous pouvez maintenant retourner sur le portail pour demander vos attestations.</p>
                <a href="/" style="padding:10px 20px; background:#2c3e50; color:white; text-decoration:none; border-radius:5px;">Retour au portail</a>
            </div>
        `);

    } catch (err) {
        console.error("Erreur vérification:", err);
        return res.status(500).send('<h2>Erreur serveur lors de la vérification.</h2>'); 
    }
});

module.exports = router;