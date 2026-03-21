const jwt = require('jsonwebtoken');
const Etudiant = require('../models/Etudiant');

module.exports = async (req, res, next) => {
  try {
    let token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token && req.cookies) {
        token = req.cookies.jwt;
    }

    if (!token) {
        return res.status(401).json({ error: "Accès refusé. Token manquant ou non connecté." });
    }

    const verified = jwt.verify(token, process.env.JWT_SECRET);
    
    const etudiant = await Etudiant.findById(verified.id);
    if (etudiant && etudiant.isBlocked) {
        if (res.clearCookie) res.clearCookie('jwt'); // Nettoyer le cookie si bloqué
        return res.status(403).json({ error: "Votre compte a été suspendu par l'administration." });
    }

    req.user = verified;
    next();
  } catch (err) {
    console.error("Erreur Auth:", err.message);
    res.status(400).json({ error: "Token invalide ou expiré. Veuillez vous reconnecter." });
  }
};