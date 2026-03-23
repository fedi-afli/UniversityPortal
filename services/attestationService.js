const AttestationRequest = require('../models/AttestationRequest');
<<<<<<< HEAD
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
    
=======
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

>>>>>>> 519896e0f7c71299fc124add35955190f1b8426b
    const prompt = `
Tu es un agent administratif universitaire précis et strict.
Tu dois analyser les données suivantes et décider si l'attestation de présence peut être délivrée.

Données étudiant :
<<<<<<< HEAD
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
=======
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
>>>>>>> 519896e0f7c71299fc124add35955190f1b8426b
3. Si données insuffisantes (total < 5 séances) → pending_manual

Réponds UNIQUEMENT avec un JSON valide, sans aucun texte avant ou après, sans \`\`\`json ni balises :

{
  "decision": "approved" | "rejected" | "pending_manual" | "error",
  "reason": "phrase courte et claire en français (max 80 caractères)",
  "tauxPresence": ${taux.toFixed(2)},
<<<<<<< HEAD
  "confidence": number entre 0 et 1 (estimation de ta certitude)
}

Exemple de réponse valide :
{"decision":"approved","reason":"Taux de présence suffisant (82.5%)","tauxPresence":82.5,"confidence":0.95}
    `;
=======
  "confidence": number entre 0 et 1
}
`;
>>>>>>> 519896e0f7c71299fc124add35955190f1b8426b

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
<<<<<<< HEAD
      console.error('Erreur parsing JSON Ollama:', parseError.message);
      console.error('Réponse brute reçue:', agentResponse);
=======
>>>>>>> 519896e0f7c71299fc124add35955190f1b8426b
      result = { decision: 'error', reason: 'Réponse non-JSON valide' };
    }

    request.statut = result.decision;
    request.motif_rejet = result.reason || 'Décision automatique';

    request.agent_trace = {
<<<<<<< HEAD
      tauxPresence: result.tauxPresence ?? taux.toFixed(2),
=======
      tauxPresence: result.tauxPresence ?? parseFloat(taux.toFixed(2)),
>>>>>>> 519896e0f7c71299fc124add35955190f1b8426b
      raw: agentResponse,
      confidence: result.confidence ?? 0.8
    };

    if (result.decision === 'approved') {
      try {
<<<<<<< HEAD
        const pdfPath = await generateAttestationPDF(request, request.etudiant, request.inscription);
        request.file_path = pdfPath;
        request.date_generation = new Date();
        console.log(`PDF généré avec succès : ${pdfPath}`);
        await sendAttestationReadyEmail(request.etudiant);
      } catch (pdfErr) {
        console.error('Erreur génération PDF:', pdfErr.message);
=======
        const pdfPath = await generateAttestationPDF(request, request.student, request.enrollment);
        request.file_path = pdfPath;
        request.date_generation = new Date();
        await sendAttestationReadyEmail(request.student);
      } catch (pdfErr) {
>>>>>>> 519896e0f7c71299fc124add35955190f1b8426b
        request.statut = 'error';
        request.motif_rejet = 'Erreur lors de la génération du document PDF';
      }
    }

    await request.save();
<<<<<<< HEAD
    console.log(`Demande ${requestId} traitée - statut final : ${request.statut}`);
=======
>>>>>>> 519896e0f7c71299fc124add35955190f1b8426b
  } catch (err) {
    console.error(`Erreur globale traitement attestation ${requestId} :`, err.message);
  }
}

module.exports = { processAttestationRequest };