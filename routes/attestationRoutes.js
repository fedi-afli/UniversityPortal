/* const express = require('express');
const router = express.Router();
const attestationController = require('../controllers/attestationController');
const authMiddleware = require('../middleware/authMiddleware');
router.get('/', authMiddleware,(req,res)=>{
    res.render("attestations",{etudiant:req.user })
});

router.get('/', authMiddleware,attestationController.getAllAttestationRequests);
router.get('/etudiant/:etudiantId',authMiddleware, attestationController.getAttestationRequestsByEtudiant);
router.get('/:id',authMiddleware, attestationController.getAttestationRequestById);
router.get('/:id/download',authMiddleware, attestationController.downloadAttestationPDF);
router.post('/',authMiddleware, attestationController.createAttestationRequest);

module.exports = router; */