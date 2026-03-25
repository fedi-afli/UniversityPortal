const AttestationRequest = require('../models/AttestationRequest');
const Enrollment = require('../models/Enrollment');
const Absence = require('../models/Absence');
const { generateAttestationPDF } = require('../services/pdfService');
const { sendAttestationReadyEmail, sendAttestationRejectedEmail } = require('../services/emailService');
const path = require('path');
const fs = require('fs');

/**
 * Affiche la page des attestations avec seulement les 2 dernières attestations générées
 */
exports.renderAttestationPage = async (req, res) => {
    try {
        // On récupère uniquement les 2 dernières attestations approuvées
        const historique = await AttestationRequest.find({ 
            student: req.user._id, 
            statut: 'approved' 
        })
        .sort({ createdAt: -1 }) // Trie par date décroissante (plus récent en premier)
        .limit(2);               // Limite le résultat à 2 documents

        res.render('attestations', { 
            user: req.user,      // Pour le chat-widget
            etudiant: req.user,   // Pour la navbar et infos profil
            historique: historique // Pour le tableau (contenant max 2 éléments)
        });
    } catch (err) {
        console.error('Erreur renderAttestationPage:', err);
        res.status(500).send("Erreur lors du chargement de la page");
    }
};

/**
 * Création d'une demande d'attestation
 * Gère la vérification des 20%, la création en base, le PDF et l'email
 */
exports.createAttestationRequest = async (req, res) => {
    const { matricule, annee_universitaire, semestre, periodStart, periodEnd } = req.body;

    try {
        const user = req.user; 

        // Vérification de sécurité : le matricule doit correspondre à l'utilisateur connecté
        if (user.nationalId !== matricule) {
            return res.status(403).json({ 
                success: false,
                error: 'Access denied: matricule does not match' 
            });
        }

        // 1. Vérifier l'inscription active pour la période demandée
        const inscription = await Enrollment.findOne({
            student: user._id,
            academicYear: annee_universitaire,
            semester: semestre,
            status: 'active'
        });

        if (!inscription) {
            await sendAttestationRejectedEmail(
                user,
                "Your enrollment is not active for the selected academic year and semester."
            );
            return res.status(400).json({ 
                success: false,
                error: "No active enrollment found for this period" 
            });
        }

        // 2. Calcul du seuil d'absences (20%)
        const startDate = new Date(periodStart);
        const endDate   = new Date(periodEnd);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || endDate <= startDate) {
            return res.status(400).json({ success: false, error: "Dates de période invalides" });
        }

        const diffMs   = endDate - startDate;
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        const weeks    = diffDays / 7;

        if (weeks <= 0) {
            return res.status(400).json({ success: false, error: "Période trop courte" });
        }

        const totalScheduledHours = weeks * 50; // Moyenne de 50h de cours par semaine
        const maxAllowedUnjustifiedHours = totalScheduledHours * 0.20;

        // Récupérer les absences injustifiées sur la période
        const unjustifiedAbsences = await Absence.find({
            student: user._id,
            isJustified: false,
            date: { $gte: startDate, $lte: endDate }
        }).select('startTime endTime');

        let totalUnjustifiedHours = 0;

        unjustifiedAbsences.forEach(abs => {
            if (!abs.startTime || !abs.endTime) return;
            const [sh, sm] = abs.startTime.split(':').map(Number);
            const [eh, em] = abs.endTime.split(':').map(Number);
            const duration = (eh * 60 + em - (sh * 60 + sm)) / 60;
            if (duration > 0) totalUnjustifiedHours += duration;
        });

        // 3. Décision basée sur le seuil d'absences
        if (totalUnjustifiedHours >= maxAllowedUnjustifiedHours) {
            const reason = `Seuil d'absences dépassé : ${totalUnjustifiedHours.toFixed(1)}h (Maximum autorisé : ${maxAllowedUnjustifiedHours.toFixed(1)}h)`;
            await sendAttestationRejectedEmail(user, reason);
            return res.status(400).json({ 
                success: false, 
                error: `Absence limit exceeded (20% allowed). Total: ${totalUnjustifiedHours.toFixed(1)} hours.`
            });
        }

        // 4. Enregistrement de la demande en base de données
        const request = new AttestationRequest({
            student: user._id,
            enrollment: inscription._id,
            annee_universitaire,
            semestre,
            periode_debut: startDate,
            periode_fin: endDate,
            statut: 'approved'
        });

        await request.save();

        // 5. Génération du fichier PDF
        const pdfPath = await generateAttestationPDF(request, user, inscription);
        request.file_path = pdfPath;
        request.date_generation = new Date();
        await request.save();

        // 6. Envoi de l'email automatique avec le PDF en pièce jointe
        await sendAttestationReadyEmail(user, pdfPath);

        res.status(201).json({
            success: true,
            message: 'Attestation generated successfully and sent by email.',
            requestId: request._id
        });

    } catch (err) {
        console.error('Erreur createAttestationRequest:', err);
        res.status(500).json({ success: false, error: 'Erreur interne du serveur lors du traitement' });
    }
};

/**
 * Téléchargement sécurisé du fichier PDF (utilisé par le tableau de l'historique)
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