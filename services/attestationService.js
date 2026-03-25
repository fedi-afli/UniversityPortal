const AttestationRequest = require('../models/AttestationRequest');
const Absence = require('../models/Absence');
const { askOllama } = require('./ollamaService');
const { generateAttestationPDF } = require('./pdfService');
const { sendAttestationReadyEmail } = require('./emailService');

/**
 * Traite une demande d'attestation et met à jour son statut.
 * @param {string} requestId - ID de la demande
 */
async function processAttestationRequest(requestId) {
  try {
    // Récupérer la demande avec étudiant et inscription
    const request = await AttestationRequest.findById(requestId)
      .populate('student')
      .populate('enrollment');

    if (!request) return;

    // Récupérer les absences sur la période
    const absences = await Absence.find({
      student: request.student._id,
      date: { $gte: request.periode_debut, $lte: request.periode_fin }
    });

    // Calcul du taux de présence
    const totalSessions = absences.length > 0 ? absences.length : 20; // ajustable si tu as le total réel
    const unjustifiedAbsences = absences.filter(a => !a.isJustified).length;
    const effectivePresents = totalSessions - unjustifiedAbsences;
    const taux = totalSessions > 0 ? (effectivePresents / totalSessions) * 100 : 0;

    // Construire le prompt pour l'agent Gemma
    const prompt = `
Tu es un agent administratif universitaire précis et strict.
Tu dois analyser les données suivantes et décider si l'attestation de présence peut être délivrée.

Données étudiant :
- Nom : ${request.student.lastName} ${request.student.firstName}
- CIN/N° inscription : ${request.student.nationalId || request.student.studentId || 'N/A'}
- Formation : ${request.enrollment.programCode || 'N/A'}
- Année : ${request.enrollment.academicYear}
- Semestre : ${request.enrollment.semester}

Période demandée : ${request.periode_debut.toISOString().split('T')[0]} → ${request.periode_fin.toISOString().split('T')[0]}

Statistiques d'assiduité :
- Nombre total de séances prévues : ${totalSessions}
- Nombre total d'absences : ${absences.length}
- Absences non justifiées : ${unjustifiedAbsences}
- Séances considérées comme suivies : ${effectivePresents}
- Taux de présence effectif : ${taux.toFixed(2)} %

Règles officielles :
1. Taux ≥ 75% → approved
2. Taux < 75% → rejected
3. Si données insuffisantes (total < 5 séances) → pending_manual

Réponds UNIQUEMENT avec un JSON valide, sans texte ni balises :

{
  "decision": "approved" | "rejected" | "pending_manual" | "error",
  "reason": "phrase courte et claire en français (max 80 caractères)",
  "tauxPresence": ${taux.toFixed(2)},
  "confidence": number entre 0 et 1
}
`;

    // Appel à l'agent IA
    const agentResponse = await askOllama(prompt);

    // Parser la réponse JSON de manière robuste
    let result;
    try {
      const cleaned = agentResponse
        .trim()
        .replace(/^```json\s*/i, '')
        .replace(/\s*```$/i, '')
        .replace(/[\n\r]+/g, ' ');

      result = JSON.parse(cleaned);
    } catch {
      result = { decision: 'error', reason: 'Réponse non-JSON valide' };
    }

    // Mettre à jour la demande
    request.statut = result.decision;
    request.motif_rejet = result.reason || 'Décision automatique';
    request.agent_trace = {
      tauxPresence: result.tauxPresence ?? parseFloat(taux.toFixed(2)),
      raw: agentResponse,
      confidence: result.confidence ?? 0.8
    };

    // Générer PDF uniquement si approuvé
    if (result.decision === 'approved') {
      try {
        const pdfPath = await generateAttestationPDF(request, request.student, request.enrollment);
        request.file_path = pdfPath;
        request.date_generation = new Date();
        await sendAttestationReadyEmail(request.student);
      } catch (pdfErr) {
        request.statut = 'error';
        request.motif_rejet = 'Erreur lors de la génération du document PDF';
      }
    }

    await request.save();

  } catch (err) {
    console.error(`Erreur globale traitement attestation ${requestId} :`, err.message);
  }
}

module.exports = { processAttestationRequest };