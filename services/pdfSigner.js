const fs = require('fs');
const path = require('path');
const { SignPdf } = require('@signpdf/signpdf');
const { P12Signer } = require('@signpdf/signer-p12'); // Importez le nouveau module
const { plainAddPlaceholder } = require('@signpdf/placeholder-plain');

async function signPDF(pdfPath) {
    // 1. Lire le fichier généré par PDFKit
    let pdfBuffer = fs.readFileSync(pdfPath);

    // 2. Ajouter l'espace réservé (placeholder) pour la signature numérique
    pdfBuffer = plainAddPlaceholder({
        pdfBuffer,
        reason: 'Attestation Officielle',
        contactInfo: 'fsb@university.tn',
        name: 'Secrétaire Général FSB',
        location: 'Bizerte, Tunisie',
        signatureLength: 1612, // Si erreur "Buffer overflow", augmentez à 4096
    });

    // 3. Charger le certificat
    const p12Path = path.join(__dirname, '../certificates/sg_cert.p12');
    if (!fs.existsSync(p12Path)) {
        throw new Error('Certificat P12 introuvable à : ' + p12Path);
    }
    const p12Buffer = fs.readFileSync(p12Path);

    // 4. Initialiser le signataire P12
    const signer = new P12Signer(p12Buffer, {
        passphrase: process.env.SG_CERT_PASSWORD || 'votre_mot_de_passe'
    });

    const mainSigner = new SignPdf();

    try {
        // 5. SIGNER (L'utilisation de await est CRUCIALE ici)
        // On passe l'instance 'signer' au lieu du buffer p12
        const signedPdfBuffer = await mainSigner.sign(pdfBuffer, signer);

        // 6. Écraser le fichier original avec le PDF maintenant signé numériquement
        fs.writeFileSync(pdfPath, signedPdfBuffer);
        
        return pdfPath;
    } catch (error) {
        console.error("Erreur détaillée lors de la signature :", error);
        throw error;
    }
}

module.exports = { signPDF };