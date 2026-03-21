const mongoose = require('mongoose');

const attestationSchema = new mongoose.Schema({
  etudiant:           { type: mongoose.Schema.Types.ObjectId, ref: 'Etudiant', required: true },
  inscription:        { type: mongoose.Schema.Types.ObjectId, ref: 'Inscription', required: true },
  type:               { type: String, enum: ['presence', 'inscription', 'scolarite'], default: 'presence' },
  annee_universitaire:{ type: String, required: true },
  periode_debut:      { type: Date, required: true },
  periode_fin:        { type: Date, required: true },
  date_demande:       { type: Date, default: Date.now },
  date_generation:    { type: Date },
  statut:             { 
    type: String, 
    enum: ['pending', 'processing', 'approved', 'rejected', 'error', 'cancelled'],
    default: 'pending'
  },
  motif_rejet:        { type: String },
  file_path:          { type: String },
  file_url:           { type: String },              
  qr_code_data:       { type: String },
  agent_trace:        { type: mongoose.Schema.Types.Mixed },
  created_at:         { type: Date, default: Date.now },
  updated_at:         { type: Date }
}, { timestamps: true });

attestationSchema.index({ etudiant: 1, date_demande: -1 });

module.exports = mongoose.model('AttestationRequest', attestationSchema);