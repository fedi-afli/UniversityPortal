const AttestationRequest = require('../models/AttestationRequest');
const Absence = require('../models/Absence');
const { askOllama } = require('./ollamaService');
const { generateAttestationPDF } = require('./pdfService');
const { sendAttestationReadyEmail } = require('./emailService');

async function processAttestationRequest(requestId) {
  try {
    const request = await AttestationRequest.findById(requestId)
      .populate('student')
      .populate('enrollment');

    if (!request) {
      return;
    }

    const absences = await Absence.find({
      student: request.student._id,
      date: { $gte: request.periode_debut, $lte: request.periode_fin }
    });

    const totalSessions = 20;
    const unjustifiedAbsences = absences.filter(a => a.isJustified === false).length;
    const effectivePresents = totalSessions - unjustifiedAbsences;
    const taux = totalSessions > 0 ? (effectivePresents / totalSessions) * 100 : 0;

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

Règles officielles (à respecter strictement) :
1. Taux ≥ 75% → approved
2. Taux < 75% → rejected
3. Si données insuffisantes (total < 5 séances) → pending_manual

Réponds UNIQUEMENT avec un JSON valide, sans aucun texte avant ou après, sans \`\`\`json ni balises :

{
  "decision": "approved" | "rejected" | "pending_manual" | "error",
  "reason": "phrase courte et claire en français (max 80 caractères)",
  "tauxPresence": ${taux.toFixed(2)},
  "confidence": number entre 0 et 1
}
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
      result = { decision: 'error', reason: 'Réponse non-JSON valide' };
    }

    request.statut = result.decision;
    request.motif_rejet = result.reason || 'Décision automatique';

    request.agent_trace = {
      tauxPresence: result.tauxPresence ?? parseFloat(taux.toFixed(2)),
      raw: agentResponse,
      confidence: result.confidence ?? 0.8
    };

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