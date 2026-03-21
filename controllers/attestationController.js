const Etudiant = require('../models/Etudiant');
const Inscription = require('../models/Inscription');
const Attendance = require('../models/Presence');
const AttestationRequest = require('../models/AttestationRequest');
const { generateAttestationPDF } = require('../services/pdfService');
const { askOllama } = require('../services/ollamaService');
const { processAttestationRequest } = require('../services/attestationService');
const path = require('path');
const fs = require('fs');
exports.downloadAttestationPDF = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await AttestationRequest.findById(id);

    if (!request || !request.file_path) {
      return res.status(404).json({ error: 'Attestation non trouvée ou PDF non généré' });
    }

    const filePath = path.join(__dirname, '..', request.file_path);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Fichier physique introuvable sur le serveur' });
    }

    res.download(filePath); 
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
exports.createAttestationRequest = async (req, res) => {
  try {
    const { matricule, annee_universitaire, semestre, periodStart, periodEnd } = req.body;

    const student = await Etudiant.findOne({ numero_inscription: matricule });
    if (!student) {
      return res.status(404).json({ error: 'Étudiant non trouvé' });
    }

    const inscription = await Inscription.findOne({
      etudiant: student._id,
      annee_universitaire,
      semestre,
      statut: 'active'
    });

    if (!inscription) {
      return res.status(404).json({ error: 'Inscription non trouvée ou non active pour cette période' });
    }

    const request = new AttestationRequest({
      etudiant: student._id,
      inscription: inscription._id,
      annee_universitaire,
      periode_debut: new Date(periodStart),
      periode_fin: new Date(periodEnd),
      statut: 'pending'
    });

    await request.save();

    processAttestationRequest(request._id);

    res.status(201).json({ 
      message: 'Demande reçue – traitement en cours',
      requestId: request._id 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.getAllAttestationRequests = async (req, res) => {
  try {
    const requests = await AttestationRequest.find()
      .populate('etudiant', 'nom prenom cin numero_inscription')
      .populate('inscription', 'annee_universitaire semestre statut')
      .sort({ date_demande: -1 })
      .limit(50); 

    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAttestationRequestsByEtudiant = async (req, res) => {
  try {
    const { etudiantId } = req.params;

    const requests = await AttestationRequest.find({ etudiant: etudiantId })
      .populate('inscription', 'annee_universitaire semestre')
      .sort({ date_demande: -1 });

    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAttestationRequestById = async (req, res) => {
  try {
    const { id } = req.params;

    const request = await AttestationRequest.findById(id)
      .populate('etudiant', 'nom prenom cin numero_inscription email_universitaire')
      .populate('inscription');

    if (!request) {
      return res.status(404).json({ error: 'Demande non trouvée' });
    }

    res.json(request);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};