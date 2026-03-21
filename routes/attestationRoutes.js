const express = require('express');
const router = express.Router();
const attestationController = require('../controllers/attestationController');
const auth = require('../middleware/auth');
router.get('/', attestationController.getAllAttestationRequests);
router.get('/etudiant/:etudiantId', attestationController.getAttestationRequestsByEtudiant);
router.get('/:id', attestationController.getAttestationRequestById);
router.get('/:id/download', attestationController.downloadAttestationPDF);
router.post('/', attestationController.createAttestationRequest);

module.exports = router;