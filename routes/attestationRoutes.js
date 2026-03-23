// routes/attestationRoutes.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const attestationController = require('../controllers/attestationController');

// === TOUTES LES ROUTES PROTÉGÉES ===
router.get('/', authMiddleware, attestationController.renderAttestationPage);
router.post('/', authMiddleware, attestationController.createAttestationRequest);
router.get('/:id/download', authMiddleware, attestationController.downloadAttestationPDF);

module.exports = router;