const express = require('express');
const router = express.Router();
const { askOllama } = require('../services/ollamaService');
const attestationController = require('../controllers/attestationController');

router.post('/message', async (req, res) => {
    try {
        const { message } = req.body;

        const extractionPrompt = `
        Analyse le message suivant : "${message}"
        Tu es un extracteur de données strict. 
        
        INSTRUCTIONS :
        1. "year" : Trouve l'année universitaire (ex: 2024-2025).
        2. "semester" : Choisis UNIQUEMENT entre "S1", "S2", ou "Annual". 
           - Si l'utilisateur mentionne "semestre 1" ou "premier semestre" -> "S1"
           - Si l'utilisateur mentionne "semestre 2" ou "deuxième semestre" -> "S2"
           - Si l'utilisateur mentionne "annuel" ou "toute l'année" -> "Annual"
        3. "intent" : "request_attestation" si c'est une demande de document.

        RÉPONDS UNIQUEMENT PAR UN JSON SANS TEXTE AVANT OU APRÈS.
        FORMAT : {"year": "...", "semester": "...", "intent": "..."}
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