const AttestationRequest = require('../models/AttestationRequest');
const Enrollment = require('../models/Enrollment');
const Absence = require('../models/Absence');
const { generateAttestationPDF } = require('../services/pdfService');
const { sendAttestationReadyEmail, sendAttestationRejectedEmail } = require('../services/emailService');
const path = require('path');
const fs = require('fs');

exports.renderAttestationPage = (req, res) => {
  res.render('attestations', { etudiant: req.user });
};

exports.createAttestationRequest = async (req, res) => {
  const { matricule, annee_universitaire, semestre, periodStart, periodEnd } = req.body;

  try {
    const etudiant = req.user;

    // Vérification de cohérence : l'étudiant ne peut demander que pour lui-même
    if (etudiant.nationalId !== matricule) {
      return res.status(403).json({ 
        success: false,
        error: 'Accès non autorisé : matricule non correspondant' 
      });
    }

    // 1. Vérifier l'inscription active pour l'année et le semestre demandés
    const inscription = await Enrollment.findOne({
      student: etudiant._id,
      academicYear: annee_universitaire,
      semester: semestre,
      status: 'active'
    });

    if (!inscription) {
      await sendAttestationRejectedEmail(
        etudiant,
        "Votre inscription n'est pas active pour l'année universitaire et le semestre sélectionnés."
      );
      return res.status(400).json({ 
        success: false,
        error: "Aucune inscription active trouvée pour cette période" 
      });
    }

    // ───────────────────────────────────────────────────────────────
    // Calcul du seuil d'absences injustifiées (20 % des heures théoriques)
    // ───────────────────────────────────────────────────────────────

    const startDate = new Date(periodStart);
    const endDate   = new Date(periodEnd);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || endDate <= startDate) {
      return res.status(400).json({ 
        success: false,
        error: "Période invalide : la date de fin doit être postérieure à la date de début" 
      });
    }

    // Nombre approximatif de semaines (différence brute)
    const diffMs   = endDate - startDate;
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    const weeks    = diffDays / 7;

    if (weeks <= 0) {
      return res.status(400).json({ 
        success: false,
        error: "La période demandée est trop courte" 
      });
    }

    // Hypothèse : 50 heures par semaine (lundi à vendredi, 10h/jour)
    const totalScheduledHours = weeks * 50;

    // Seuil maximal autorisé = 20 %
    const maxAllowedUnjustifiedHours = totalScheduledHours * 0.20;

    // Récupérer les absences injustifiées dans l'intervalle demandé
    const unjustifiedAbsences = await Absence.find({
      student: etudiant._id,
      isJustified: false,
      date: { $gte: startDate, $lte: endDate }
    }).select('date startTime endTime');

    // Calcul du total d'heures d'absence injustifiée
    let totalUnjustifiedHours = 0;

    unjustifiedAbsences.forEach(abs => {
      if (!abs.startTime || !abs.endTime) {
        console.warn(`Absence sans horaire ignorée (ID: ${abs._id})`);
        return;
      }

      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(abs.startTime) || !timeRegex.test(abs.endTime)) {
        console.warn(`Format d'heure invalide ignoré : ${abs.startTime} → ${abs.endTime}`);
        return;
      }

      const [sh, sm] = abs.startTime.split(':').map(Number);
      const [eh, em] = abs.endTime.split(':').map(Number);

      const startMinutes = sh * 60 + sm;
      const endMinutes   = eh * 60 + em;

      if (endMinutes <= startMinutes) {
        console.warn(`Intervalle invalide ignoré : ${abs.startTime} → ${abs.endTime}`);
        return;
      }

      const durationHours = (endMinutes - startMinutes) / 60;
      totalUnjustifiedHours += durationHours;
    });

    // ── Décision sur le seuil ──────────────────────────────────────────

    if (totalUnjustifiedHours >= maxAllowedUnjustifiedHours) {
      const reason = `Absences injustifiées : ${totalUnjustifiedHours.toFixed(1)} heure(s) sur un maximum autorisé de ${maxAllowedUnjustifiedHours.toFixed(1)} heure(s) (20 % des ${totalScheduledHours.toFixed(0)} heures théoriques de la période).`;

      await sendAttestationRejectedEmail(etudiant, reason);

      return res.status(400).json({ 
        success: false,
        error: "Dépassement du seuil d'absences autorisées (20 %)",
        details: {
          unjustifiedHours: totalUnjustifiedHours.toFixed(1),
          maxAllowedHours: maxAllowedUnjustifiedHours.toFixed(1),
          periodHoursApprox: totalScheduledHours.toFixed(0)
        }
      });
    }

    // ───────────────────────────────────────────────────────────────
    // Succès : création de la demande et génération du document
    // ───────────────────────────────────────────────────────────────

    const request = new AttestationRequest({
      etudiant: etudiant._id,
      inscription: inscription._id,
      annee_universitaire,
      semestre,
      periode_debut: startDate,
      periode_fin: endDate,
      statut: 'approved'
    });

    await request.save();

    // Génération PDF
    const pdfPath = await generateAttestationPDF(request, etudiant, inscription);
    request.file_path = pdfPath;
    request.date_generation = new Date();
    await request.save();

    // Envoi email de confirmation
    await sendAttestationReadyEmail(etudiant);

    res.status(201).json({
      success: true,
      message: 'Attestation générée avec succès',
      requestId: request._id
    });

  } catch (err) {
    console.error('Erreur lors de la création de la demande d\'attestation :', err);
    res.status(500).json({ 
      success: false,
      error: 'Erreur interne du serveur',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

exports.downloadAttestationPDF = async (req, res) => {
  try {
    const { id } = req.params;

    const request = await AttestationRequest.findById(id)
      .populate('etudiant', 'firstName lastName nationalId email');

    if (!request) {
      return res.status(404).json({ success: false, error: 'Demande non trouvée' });
    }

    if (request.etudiant._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Accès non autorisé' });
    }

    if (!request.file_path) {
      return res.status(400).json({ success: false, error: 'Le document PDF n’a pas encore été généré' });
    }

    const filePath = path.join(__dirname, '..', request.file_path);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'Fichier PDF introuvable sur le serveur' });
    }

    res.download(filePath, `attestation_${request.etudiant.nationalId || 'etudiant'}_${request._id}.pdf`);

  } catch (err) {
    console.error('Erreur lors du téléchargement du PDF :', err);
    res.status(500).json({ 
      success: false,
      error: 'Erreur lors du téléchargement du document'
    });
  }
};