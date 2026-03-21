const mongoose = require('mongoose');

const classeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true
   
  },
  formation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Formation',
    required: true
  },
  annee_universitaire: {
    type: String,
    required: true
  },
  groupe: {
    type: String,
    required: true
  },
  capacite_max: {
    type: Number,
    default: 40
  },
  responsable: {
    type: String,
    trim: true
  },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date }
}, { timestamps: true });

classeSchema.index({ formation: 1, annee_universitaire: 1, groupe: 1 }, { unique: true });

classeSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

module.exports = mongoose.model('Classe', classeSchema);