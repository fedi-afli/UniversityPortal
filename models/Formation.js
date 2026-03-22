// src/models/Formation.js
const mongoose = require('mongoose');

const formationSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  nom: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['Licence', 'Master', 'Ingénieur', 'Cycle préparatoire'],
    required: true
  },
  niveau: {
    type: String,
    required: true
    
  },
  departement: {
    type: String,
    required: true,
    trim: true
  },

  duree_annees: {
    type: Number,
    default: 3
  },
  description: {
    type: String,
    trim: true
  },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date }
}, { timestamps: true });

formationSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

module.exports = mongoose.model('Formation', formationSchema);