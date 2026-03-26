const express = require('express');
const router = express.Router();
const { askOllama } = require('../services/ollamaService');
const attestationController = require('../controllers/attestationController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/message', authMiddleware,async (req, res) => {
    try {
        const { message } = req.body;
        console.log("la message : " +message)
        const extractionPrompt = `
        Analyze the following message: "${message}"
        You are a strict data extractor.

        INSTRUCTIONS:
        1. "year": Find the academic year (e.g., 2024-2025).
        2. "semester": Choose ONLY between "S1", "S2", or "Annual".
        - If the user mentions "semester 1" or "first semester" -> "S1"
        - If the user mentions "semester 2" or "second semester" -> "S2"
        - If the user mentions "annual" or "full year" -> "Annual"
        3. "intent": "request_attestation" if it is a request for a document.

        RESPOND ONLY WITH A JSON WITHOUT ANY TEXT BEFORE OR AFTER.
        FORMAT: {"year": "...", "semester": "...", "intent": "..."}
        `;
        
        const aiResponse = await askOllama(extractionPrompt);
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);

        if (!jsonMatch) return res.json({ reply: "Détails manquants. Précisez l'année et le semestre." });

        const data = JSON.parse(jsonMatch[0]);

        if (data.intent === 'request_attestation') {
            
            // Extraction propre
            const finalSemester = data.semester;
            const years = data.year.split('-');
            const startYear = years[0];
            const endYear = years[1] || (parseInt(startYear) + 1).toString();

            console.log(`🔍 LOG : L'utilisateur demande ${finalSemester} pour ${data.year}`);

            // Dates dynamiques
            let pStart, pEnd;
            if (finalSemester === "S1") {
                pStart = `${startYear}-09-01`;
                pEnd = `${startYear}-12-31`;
            } else if (finalSemester === "S2") {
                pStart = `${endYear}-01-01`;
                pEnd = `${endYear}-06-30`;
            } else {
                pStart = `${startYear}-09-01`;
                pEnd = `${endYear}-06-30`;
            }

            const fakeReq = {
                body: {
                    matricule: req.user.nationalId,
                    annee_universitaire: data.year,
                    semestre: finalSemester,
                    periodStart: pStart,
                    periodEnd: pEnd
                },
                user: req.user
            };

            const fakeRes = {
                status: () => fakeRes,
                json: (result) => {
                    if (result.success) {
                        res.json({ 
                            reply: `✅ Succès ! Votre attestation pour le semestre ${finalSemester} (${data.year}) est générée et envoyée par email.` 
                        });
                    } else {
                        res.json({ reply: `❌ Refusé : ${result.error}` });
                    }
                }
            };

            return await attestationController.createAttestationRequest(fakeReq, fakeRes);
        }

        res.json({ reply: aiResponse });

    } catch (err) {
        console.error("Erreur :", err);
        res.status(500).json({ reply: "Erreur technique." });
    }
});

module.exports = router;