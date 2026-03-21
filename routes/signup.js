const express = require('express');
const router = express.Router();
const Etudiant = require('../models/Etudiant');
const bcrypt = require('bcryptjs'); 
const crypto = require('crypto');
const { sendVerificationEmail } = require('./email');
const multer = require('multer'); 
const path = require('path');
const fs = require('fs'); 

// --- MULTER CONFIGURATION (Gestion de la photo de profil) ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../uploads/profile-pictures');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(4).toString('hex');
        const ext = path.extname(file.originalname);
        cb(null, `profile-${uniqueSuffix}${ext}`);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Limite à 5MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Seules les images sont autorisées !'), false);
        }
    }
}).single('profilePicture');

// Helper pour ne répondre qu'une seule fois
const sendOnce = (callback) => {
    try {
        callback();
    } catch (e) {
        if (e.code !== 'ERR_HTTP_HEADERS_SENT') {
            console.error('Error sending response:', e);
        }
    }
};

// Nettoyage en cas d'erreur
const deleteFile = (filePath) => {
    fs.unlink(filePath, (err) => {
        if (err && err.code !== 'ENOENT') console.error('Erreur suppression fichier:', err);
    });
};

// --- ROUTE D'INSCRIPTION ---
router.post('/', upload, async (req, res) => {
    try {
        // 1. On récupère les VRAIS champs du modèle Etudiant PFA
        const { cin, nom, prenom, email, password } = req.body;

        // Validation de base
        if (!cin || !nom || !prenom || !email || !password) {
            if (req.file) deleteFile(req.file.path);
            return sendOnce(() => res.status(400).json({ message: 'Veuillez remplir tous les champs obligatoires (CIN, Nom, Prénom, Email, Mot de passe).' }));
        }

        // 2. Vérifier si l'étudiant existe déjà (par Email ou par CIN)
        const existingUser = await Etudiant.findOne({ $or: [{ email: email }, { cin: cin }] });
        if (existingUser) {
            if (req.file) deleteFile(req.file.path);
            return sendOnce(() => res.status(400).json({ message: 'Un étudiant avec cet Email ou ce CIN existe déjà.' }));
        }

        // 3. Hashage du mot de passe
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 4. Génération du token de vérification d'email
        const verificationToken = crypto.randomBytes(32).toString('hex');

        // Définition de l'image de profil
        const profilePicturePath = req.file 
            ? `/uploads/profile-pictures/${req.file.filename}` 
            : '/uploads/default-avatars/default.png';

        // 5. Création de l'étudiant
        const user = new Etudiant({
            cin,
            nom,
            prenom,
            email,
            password: hashedPassword,
            verificationToken,
            profilePicture: profilePicturePath,
            isVerified: false
        });

        await user.save();

        // 6. Envoi de l'email de vérification
        const verifyURL = `${req.protocol}://${req.get('host')}/verify/${verificationToken}`;
        try {
            await sendVerificationEmail(email, verifyURL);
            return sendOnce(() => res.status(201).json({
                message: 'Inscription réussie. Veuillez vérifier votre boîte email.',
                profilePicture: profilePicturePath
            }));
        } catch (mailErr) {
            console.error('❌ Echec envoi email de vérification:', mailErr);
            // On nettoie la BDD si l'email n'a pas pu partir
            try {
                await Etudiant.deleteOne({ _id: user._id });
            } catch (delErr) {
                console.error('❌ Echec suppression utilisateur après erreur email:', delErr);
            }
            if (req.file) deleteFile(req.file.path);
            return sendOnce(() => res.status(500).json({ message: "L'email de vérification n'a pas pu être envoyé. Veuillez réessayer." }));
        }
        
    } catch (err) {
        if (req.file) deleteFile(req.file.path);

        if (err instanceof multer.MulterError) {
             return sendOnce(() => res.status(400).json({ message: `Erreur d'upload: ${err.message}` }));
        }
        
        if (err.code === 11000) { 
            return sendOnce(() => res.status(400).json({ message: 'Cet Email ou ce CIN est déjà utilisé.' }));
        }
        
        console.error("❌ ERREUR SERVEUR CRITIQUE:", err); 
        return sendOnce(() => res.status(500).json({ message: 'Erreur serveur interne' }));
    }
});

module.exports = router;