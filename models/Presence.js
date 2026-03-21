const mongoose = require('mongoose');

const presenceSchema = new mongoose.Schema({
  etudiant:       { type: mongoose.Schema.Types.ObjectId, ref: 'Etudiant', required: true },
  inscription:    { type: mongoose.Schema.Types.ObjectId, ref: 'Inscription', required: true },
  matiere_code:   { type: String, required: true },        // "BD-202", "ALGO-L3"
  date_seance:    { type: Date, required: true },
  type_seance:    { type: String, enum: ['Cours', 'TD', 'TP'], required: true },
  statut:         { 
    type: String, 
    enum: ['present', 'absent', 'justifie', 'retard'],
    default: 'absent'
  },
  justification:  { type: String },
  marquee_par:    { type: String },
  created_at:     { type: Date, default: Date.now }
}, { timestamps: true });

presenceSchema.index({ etudiant: 1, date_seance: 1 });

module.exports = mongoose.model('Presence', presenceSchema);