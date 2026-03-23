const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { signPDF } = require('./pdfSigner'); // Import de l'étape 1

async function generateAttestationPDF(request, etudiant, inscription) {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });

        const fileName = `attestation_${etudiant.nationalId || etudiant.studentId}_${Date.now()}.pdf`;
        const outputPath = path.join(__dirname, '../public/uploads/attestations', fileName);

        fs.mkdirSync(path.dirname(outputPath), { recursive: true });

        const stream = fs.createWriteStream(outputPath);
        doc.pipe(stream);

        // --- En-tête ---
        doc.fontSize(11).font('Times-Roman');
        doc.text('République Tunisienne', { align: 'center' });
        doc.text("Ministère de l'enseignement supérieur et de la Recherche Scientifique", { align: 'center' });
        doc.text('Université de Bizerte', { align: 'center' });
        doc.font('Times-Bold').text('FACULTE DES SCIENCES DE BIZERTE', { align: 'center' });
        doc.moveDown(4);

        doc.fontSize(18).font('Times-Bold').text('ATTESTATION DE PRESENCE', { align: 'center', underline: true });
        doc.moveDown(3);

        // --- Corps du texte ---
        doc.fontSize(12).font('Times-Roman');
        doc.text("Le Secrétaire Général de la Faculté des Sciences De Bizerte atteste que l'étudiant(e) :", { align: 'left' });
        doc.moveDown(1.5);

        const dateNaissance = etudiant.dateOfBirth ? new Date(etudiant.dateOfBirth).toLocaleDateString('fr-FR') : '...../......../........';
        const formation = inscription.programCode || '...........';
        const anneeUniv = inscription.academicYear || '........./..................';

        doc.text(`Nom : ${etudiant.lastName.toUpperCase()}`, { indent: 30 });
        doc.moveDown(0.5);
        doc.text(`Prénom: ${etudiant.firstName.charAt(0).toUpperCase() + etudiant.firstName.slice(1)}`, { indent: 30 });
        doc.moveDown(0.5);
        doc.text(`Né(e) le : ${dateNaissance}`, { indent: 30 });
        doc.moveDown(0.5);
        doc.text(`Titulaire de la carte d'identité nationale n°: ${etudiant.nationalId}`, { indent: 30 });
        doc.moveDown(0.5);
        doc.text(`Inscrit(e) en ${formation} pour l'année ${anneeUniv}`, { indent: 30 });

        doc.moveDown(2);
        doc.text("La présente attestation est délivrée à l'intéressé(e), pour servir et valoir ce que de droit.", { align: 'justify' });
        doc.moveDown(4);

        const currentDate = new Date().toLocaleDateString('fr-FR');
        doc.text(`Tunis, le ${currentDate}`, { align: 'right' });
        doc.moveDown(1);

        // --- AJOUT : SIGNATURE VISUELLE (Image) ---
        const signatureImgPath = path.join(__dirname, '../public/uploads/signatures/sg_signature.png');
        if (fs.existsSync(signatureImgPath)) {
            // On place l'image à droite, juste au-dessus du titre
            doc.image(signatureImgPath, 350, doc.y, { width: 150 });
            doc.moveDown(2);
        }

        doc.font('Times-Bold').text('Le Secrétaire Général', { align: 'right', indent: 50 });

        doc.end();

        // --- AJOUT : SIGNATURE NUMÉRIQUE (Après la fermeture du flux) ---
        stream.on('finish', async () => {
            try {
                // On applique la signature cryptographique sur le fichier créé
                await signPDF(outputPath);
                resolve(`/public/uploads/attestations/${fileName}`);
            } catch (err) {
                reject(err);
            }
        });

        stream.on('error', reject);
    });
}

module.exports = { generateAttestationPDF };