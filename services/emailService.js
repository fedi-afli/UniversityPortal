const nodemailer = require('nodemailer');
const path = require('path');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/**
 * Envoie l'email de succès avec le PDF en pièce jointe
 * @param {Object} etudiant - L'objet utilisateur/étudiant
 * @param {String} pdfPath - Le chemin relatif du fichier PDF généré
 */
async function sendAttestationReadyEmail(etudiant, pdfPath) {
  const email = etudiant.email || etudiant.email_universitaire;
  if (!email) return console.log("No email found for student");

  const portalUrl = `http://localhost:${process.env.PORT || 5000}`;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: '🎓 Votre attestation de présence est prête !',
    html: `
      <h2>Bonjour ${etudiant.firstName} ${etudiant.lastName},</h2>     
      <p>Félicitations ! Votre demande d'attestation de présence a été <b>approuvée</b>.</p>
      <p>Vous trouverez votre document officiel en <b>pièce jointe</b> à cet email.</p>
      <p>Vous pouvez également la retrouver à tout moment sur votre portail.</p>
      <br>
      <a href="${portalUrl}" style="padding: 10px 20px; background-color: #2ecc71; color: white; text-decoration: none; border-radius: 5px;">Accéder au portail</a>
      <br><br>
      <p>Cordialement,<br>L'administration.</p>
    `,
    // AJOUT DE LA PIÈCE JOINTE
    attachments: pdfPath ? [
      {
        filename: 'Attestation_Presence.pdf',
        path: path.join(__dirname, '..', pdfPath), // On remonte d'un dossier pour partir de la racine
        contentType: 'application/pdf'
      }
    ] : []
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Email avec PDF envoyé avec succès à ${email}`);
  } catch (err) {
    console.error("❌ Erreur envoi email succès avec pièce jointe:", err);
  }
}

/**
 * Envoie l'email de refus avec la raison
 */
async function sendAttestationRejectedEmail(etudiant, reason) {
  const email = etudiant.email || etudiant.email_universitaire;
  if (!email) return console.log("No email found for student");

  const portalUrl = `http://localhost:${process.env.PORT || 5000}`;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: '❌ Demande d’attestation REFUSÉE',
    html: `
      <h2>Bonjour ${etudiant.firstName || etudiant.prenom} ${etudiant.lastName || etudiant.nom},</h2>
      <p style="color: #c0392b; font-weight: bold;">Votre demande d'attestation de présence a été refusée par le système.</p>
      <p><strong>Raison du refus :</strong> ${reason}</p>
      <p>Si vous pensez qu'il s'agit d'une erreur, veuillez contacter le secrétariat de votre établissement.</p>
      <br>
      <a href="${portalUrl}" style="padding: 10px 20px; background-color: #e74c3c; color: white; text-decoration: none; border-radius: 5px;">Retour au portail</a>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✉️ Email de refus envoyé à ${email}`);
  } catch (err) {
    console.error("❌ Erreur envoi email refus:", err);
  }
}

module.exports = {
  sendAttestationReadyEmail,
  sendAttestationRejectedEmail
};