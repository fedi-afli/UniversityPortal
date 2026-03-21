const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

async function generateAttestationPDF(request, etudiant, inscription) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    
    const fileName = `attestation_${etudiant.cin || etudiant.numero_inscription}_${Date.now()}.pdf`;
    const outputPath = path.join(__dirname, '../uploads/attestations', fileName);
    
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    doc.fontSize(11).font('Times-Roman');
    doc.text('République Tunisienne', { align: 'center' });
    doc.text('Ministère de l\'enseignement supérieur et de la Recherche Scientifique', { align: 'center' });
    doc.text('Université de Bizerte', { align: 'center' });
    doc.font('Times-Bold').text('FACULTE DES SCIENCES DE BIZERTE', { align: 'center' });
    doc.moveDown(4);

    doc.fontSize(18).font('Times-Bold').text('ATTESTATION DE PRESENCE', { align: 'center', underline: true });
    doc.moveDown(3);

    doc.fontSize(12).font('Times-Roman');
    doc.text('Le Secrétaire Général de la Faculté des Sciences De Bizerte atteste que l\'étudiant(e) :', { align: 'left' });
    doc.moveDown(1.5);

    const dateNaissance = etudiant.date_naissance ? new Date(etudiant.date_naissance).toLocaleDateString('fr-FR') : '...../......../........';
    const lieuNaissance = etudiant.lieu_naissance || '.............';
    const formation = inscription.formation_code || '...........';
    const anneeUniv = inscription.annee_universitaire || '........./..................';

    doc.text(`Nom : ${etudiant.nom.toUpperCase()}`, { indent: 30 });
    doc.moveDown(0.5);
    doc.text(`Prénom: ${etudiant.prenom.charAt(0).toUpperCase() + etudiant.prenom.slice(1)}`, { indent: 30 });
    doc.moveDown(0.5);
    doc.text(`Né(e) le : ${dateNaissance}  à  ${lieuNaissance}`, { indent: 30 });
    doc.moveDown(0.5);
    doc.text(`Titulaire de la carte d'identité nationale n°: ${etudiant.cin}`, { indent: 30 });
    doc.moveDown(0.5);
    doc.text(`Inscrit(e) en ${formation} pour l'année ${anneeUniv}`, { indent: 30 });
    
    doc.moveDown(2);
    
    doc.text('La présente attestation est délivrée à l\'intéressé(e), pour servir et valoir ce que de droit.', { align: 'justify' });
    doc.moveDown(4);

    const currentDate = new Date().toLocaleDateString('fr-FR');
    doc.text(`Tunis, le ${currentDate}`, { align: 'right' });
    doc.moveDown(1.5);
    doc.font('Times-Bold').text('Le Secrétaire Général', { align: 'right', indent: 50 });

    doc.end();

    stream.on('finish', () => resolve(`/uploads/attestations/${fileName}`));
    stream.on('error', reject);
  });
}

module.exports = { generateAttestationPDF };