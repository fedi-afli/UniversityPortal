const AttestationRequest = require('../models/AttestationRequest');
const Presence = require('../models/Presence');
const { askOllama } = require('./ollamaService');
const { generateAttestationPDF } = require('./pdfService');
const { sendAttestationReadyEmail } = require('./emailService');
async function processAttestationRequest(requestId) {
  try {
    const request = await AttestationRequest.findById(requestId)
      .populate('etudiant')
      .populate('inscription');

    if (!request) {
      console.warn(`Demande d'attestation ${requestId} non trouvée`);
      return;
    }

    const presences = await Presence.find({
      inscription: request.inscription._id,
      date_seance: { $gte: request.periode_debut, $lte: request.periode_fin }
    });

//just pour testing for now
    const total = 20; 
    const presents = 18; 
    const taux = 90.00;
    /*
    const total = presences.length;
    const presents = presences.filter(p => p.statut === 'present' || p.statut === 'justifie').length;
    const taux = total > 0 ? (presents / total) * 100 : 0;
*/
    
    const prompt = `
Tu es un agent administratif universitaire précis et strict.
Tu dois analyser les données suivantes et décider si l'attestation de présence peut être délivrée.

Données étudiant :
- Nom : ${request.etudiant.nom} ${request.etudiant.prenom}
- CIN/N° inscription : ${request.etudiant.cin || request.etudiant.numero_inscription || 'N/A'}
- Formation : ${request.inscription.formation_code || 'N/A'}
- Année : ${request.inscription.annee_universitaire}
- Semestre : ${request.inscription.semestre}

Période demandée : ${request.periode_debut.toISOString().split('T')[0]} → ${request.periode_fin.toISOString().split('T')[0]}

Statistiques de présence :
- Nombre total de séances : ${total}
- Séances présentes ou justifiées : ${presents}
- Taux de présence : ${taux.toFixed(2)} %

Règles officielles (à respecter strictement) :
1. Taux ≥ 75% → approved (sauf cas exceptionnel)
2. Taux < 75% → rejected (sauf justification médicale ou administrative forte)
3. Si données insuffisantes (total < 5 séances) → pending_manual

Réponds UNIQUEMENT avec un JSON valide, sans aucun texte avant ou après, sans \`\`\`json ni balises :

{
  "decision": "approved" | "rejected" | "pending_manual" | "error",
  "reason": "phrase courte et claire en français (max 80 caractères)",
  "tauxPresence": ${taux.toFixed(2)},
  "confidence": number entre 0 et 1 (estimation de ta certitude)
}

Exemple de réponse valide :
{"decision":"approved","reason":"Taux de présence suffisant (82.5%)","tauxPresence":82.5,"confidence":0.95}
    `;

    const agentResponse = await askOllama(prompt);

    let result;
    try {
      const cleaned = agentResponse
        .trim()
        .replace(/^```json\s*/i, '')
        .replace(/\s*```$/i, '')
        .replace(/[\n\r]+/g, ' ');

      result = JSON.parse(cleaned);
    } catch (parseError) {
      console.error('Erreur parsing JSON Ollama:', parseError.message);
      console.error('Réponse brute reçue:', agentResponse);
      result = { decision: 'error', reason: 'Réponse non-JSON valide' };
    }

    request.statut = result.decision;
    request.motif_rejet = result.reason || 'Décision automatique';

    request.agent_trace = {
      tauxPresence: result.tauxPresence ?? taux.toFixed(2),
      raw: agentResponse,
      confidence: result.confidence ?? 0.8
    };

    if (result.decision === 'approved') {
      try {
        const pdfPath = await generateAttestationPDF(request, request.etudiant, request.inscription);
        request.file_path = pdfPath;
        request.date_generation = new Date();
        console.log(`PDF généré avec succès : ${pdfPath}`);
        await sendAttestationReadyEmail(request.etudiant);
      } catch (pdfErr) {
        console.error('Erreur génération PDF:', pdfErr.message);
        request.statut = 'error';
        request.motif_rejet = 'Erreur lors de la génération du document PDF';
      }
    }

    await request.save();
    console.log(`Demande ${requestId} traitée - statut final : ${request.statut}`);
  } catch (err) {
    console.error(`Erreur globale traitement attestation ${requestId} :`, err.message);
  }
}

module.exports = { processAttestationRequest };