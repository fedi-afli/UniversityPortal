const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function sendAttestationReadyEmail(etudiant) {
  const email = etudiant.email || etudiant.email_universitaire;
  if (!email) return console.log("No email found for student");

  const portalUrl = `http://localhost:${process.env.PORT || 5000}`;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: '🎓 Votre attestation de présence est prête !',
    html: `
      <h2>Bonjour ${etudiant.firstName || etudiant.prenom} ${etudiant.lastName || etudiant.nom},</h2>
      <p>Votre attestation de présence est disponible dans votre portail.</p>
      <a href="${portalUrl}">Accéder au portail</a>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email envoyé à ${email}`);
  } catch (err) {
    console.error("Erreur envoi email succès:", err);
  }
}

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
      <p style="color: #c0392b;">Votre demande d'attestation de présence a été refusée.</p>
      <p><strong>Raison :</strong> ${reason}</p>
      <p>Contactez le secrétariat pour plus d'informations.</p>
      <a href="${portalUrl}">Retour au portail</a>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email de refus envoyé à ${email}`);
  } catch (err) {
    console.error("Erreur envoi email refus:", err);
  }
}

module.exports = {
  sendAttestationReadyEmail,
  sendAttestationRejectedEmail
};