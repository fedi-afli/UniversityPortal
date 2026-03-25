// models/AttestationRequest.js
const mongoose = require('mongoose');

const attestationSchema = new mongoose.Schema({

  student:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  enrollment:        { type: mongoose.Schema.Types.ObjectId, ref: 'Enrollment', required: true },

  annee_universitaire: { type: String, required: true },
  semestre:           { type: String, enum: ['S1', 'S2', 'Annual'], required: true },
  periode_debut:      { type: Date, required: true },
  periode_fin:        { type: Date, required: true },
  date_demande:       { type: Date, default: Date.now },
  date_generation:    { type: Date },
  statut: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  motif_rejet:        { type: String },
  file_path:          { type: String }
}, { timestamps: true });


attestationSchema.index({ student: 1, date_demande: -1 });


module.exports = mongoose.model('AttestationRequest', attestationSchema);