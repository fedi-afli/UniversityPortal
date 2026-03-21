const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function sendAttestationReadyEmail(etudiant) {
  const email = etudiant.email_universitaire || etudiant.email_personnel;
  if (!email) {
    console.log(`Aucun email trouvé pour ${etudiant.nom}`);
    return;
  }

  const portalUrl = `http://localhost:${process.env.PORT || 5000}`;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: '🎓 Votre attestation de présence est prête !',
    html: `
      <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
        <h2 style="color: #2c3e50;">Bonjour ${etudiant.prenom} ${etudiant.nom},</h2>
        <p>Nous vous informons que votre demande d'attestation de présence a été traitée et validée par notre système.</p>
        <p>Votre document officiel (PDF) est maintenant disponible au téléchargement.</p>
        <br>
        <a href="${portalUrl}" style="background-color: #27ae60; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Accéder à mon portail pour télécharger</a>
        <br><br><br>
        <p>Cordialement,<br><strong>Le Secrétariat Général</strong><br>Faculté des Sciences de Bizerte</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email de notification envoyé avec succès à ${email}`);
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email :', error.message);
  }
}

module.exports = { sendAttestationReadyEmail };