const mongoose = require('mongoose');

const inscriptionSchema = new mongoose.Schema({
  etudiant:           { type: mongoose.Schema.Types.ObjectId, ref: 'Etudiant', required: true },
  formation_code:     { type: String, required: true }, 
  annee_universitaire:{ type: String, required: true },
  semestre:           { type: String, enum: ['S1', 'S2', 'Annuel'], required: true },
  classe: { type: mongoose.Schema.Types.ObjectId, ref: 'Classe', required: true },
  statut:             { type: String, enum: ['active', 'suspendue', 'diplomee', 'redoublant'], default: 'active' },
  groupe_td:          { type: String },
  groupe_tp:          { type: String },
  date_inscription:   { type: Date, default: Date.now },
  created_at:         { type: Date, default: Date.now },
  updated_at:         { type: Date }
}, { timestamps: true });

inscriptionSchema.index({ etudiant: 1, annee_universitaire: 1 }, { unique: true });

module.exports = mongoose.model('Inscription', inscriptionSchema);