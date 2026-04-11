const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { processAttestation } = require('../services/attestationService');

// 🔐 Protected tool endpoint for the AI Agent
router.post('/process-attestation', authMiddleware, async (req, res) => {
    try {
        const { studentId, academicYear, semester } = req.body;
        
        // Use provided ID, or fallback to the logged-in user making the request
        const effectiveStudentId = studentId || req.user._id;

        if (!academicYear || !semester) {
            return res.status(400).json({
                status: 'error',
                reason: 'Missing required fields: academicYear or semester'
            });
        }

        const result = await processAttestation({
            studentId: effectiveStudentId,
            academicYear,
            semester
            // periodStart and periodEnd are intentionally omitted here.
            // The service will auto-calculate them using the dictionary.
        });

        res.json(result);

    } catch (err) {
        console.error('Tool route error:', err);
        res.status(500).json({
            status: 'error',
            reason: 'Internal server error'
        });
    }
});

module.exports = router;