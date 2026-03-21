const mongoose = require('mongoose');

const etudiantSchema = new mongoose.Schema({
  numero_inscription: { type: String, unique: true, sparse: true },
  cin:              { type: String, required: true, unique: true },
  cne:              { type: String, sparse: true }, // Code National Étudiant (optionnel)
  nom:              { type: String, required: true },
  prenom:           { type: String, required: true },
  genre:            { type: String, enum: ['M', 'F'], default: 'M' },
  date_naissance:   { type: Date },
  lieu_naissance:   { type: String },
  nationalite:      { type: String, default: 'Tunisienne' },
  email_universitaire: { type: String, unique: true, sparse: true },
  email_personnel:  { type: String, sparse: true },
  telephone:        { type: String },
  created_at:       { type: Date, default: Date.now },
  updated_at:       { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Etudiant', etudiantSchema);