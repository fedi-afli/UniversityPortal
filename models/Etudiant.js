const mongoose = require('mongoose');

const etudiantSchema = new mongoose.Schema({
  // --- Informations Académiques (Ancien Etudiant.js) ---
  numero_inscription: { type: String, unique: true, sparse: true },
  cin:              { type: String, required: true, unique: true },
  cne:              { type: String, sparse: true },
  nom:              { type: String, required: true },
  prenom:           { type: String, required: true },
  genre:            { type: String, enum: ['M', 'F'], default: 'M' },
  date_naissance:   { type: Date },
  lieu_naissance:   { type: String },
  nationalite:      { type: String, default: 'Tunisienne' },
  telephone:        { type: String },

  // --- Informations d'Authentification (Nouveau User.js fusionné) ---
  email:            { type: String, required: true, unique: true }, // Remplace email_universitaire
  password:         { type: String, required: true },
  isVerified:       { type: Boolean, default: false },
  verificationToken: String,
  passwordChangeToken: String,
  passwordChangeExpires: Date,
  profilePicture:   { type: String, default: '/uploads/default-avatars/default.png' },
  isBlocked:        { type: Boolean, default: false },

  // --- Timestamps ---
  created_at:       { type: Date, default: Date.now },
  updated_at:       { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Etudiant', etudiantSchema);