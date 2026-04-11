const AttestationRequest = require('../models/AttestationRequest');
const { processAttestation } = require('../services/attestationService');
const path = require('path');
const fs = require('fs');

/**
 * 1. Affiche la page des attestations avec seulement les 2 dernières attestations générées
 */
exports.renderAttestationPage = async (req, res) => {
    try {
        const historique = await AttestationRequest.find({ 
            student: req.user._id, 
            statut: 'approved' 
        })
        .sort({ createdAt: -1 })
        .limit(2);               

        res.render('attestations', { 
            user: req.user,      
            etudiant: req.user,   
            historique: historique 
        });
    } catch (err) {
        console.error('Erreur renderAttestationPage:', err);
        res.status(500).send("Erreur lors du chargement de la page");
    }
};

/**
 * 2. Création d'une demande d'attestation (Utilisé par l'interface Web)
 * Délègue la logique lourde au service
 */
exports.createAttestationRequest = async (req, res) => {
    const { matricule, annee_universitaire, semestre, periodStart, periodEnd } = req.body;
    const user = req.user; 

    // Vérification de sécurité
    if (user.nationalId !== matricule) {
        return res.status(403).json({ success: false, error: 'Access denied: matricule does not match' });
    }

    // Délégation au service centralisé
    const result = await processAttestation({
        studentId: user._id,
        academicYear: annee_universitaire,
        semester: semestre,
        periodStart: periodStart, // The Web UI explicitly passes exact dates
        periodEnd: periodEnd
    });

    if (!result.success) {
        return res.status(400).json({ success: false, error: result.reason });
    }

    return res.status(201).json({
        success: true,
        message: 'Attestation generated successfully and sent by email.',
        requestId: result.requestId
    });
};

/**
 * 3. Téléchargement sécurisé du fichier PDF (utilisé par le tableau de l'historique)
 */
exports.downloadAttestationPDF = async (req, res) => {
    try {
        const { id } = req.params;
        const request = await AttestationRequest.findById(id).populate('student');

        if (!request || !request.student) {
            return res.status(404).json({ success: false, error: 'Document introuvable' });
        }

        // Sécurité : Un étudiant ne peut télécharger que ses propres documents
        if (request.student._id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, error: 'Accès non autorisé à ce document' });
        }

        const filePath = path.join(__dirname, '..', request.file_path);
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ success: false, error: 'Le fichier physique n\'existe plus sur le serveur' });
        }

        res.download(filePath);
    } catch (err) {
        console.error('Erreur downloadAttestationPDF:', err);
        res.status(500).json({ success: false, error: 'Erreur lors de la récupération du fichier' });
    }
};