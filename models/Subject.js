const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
  name: { type: String, required: true }, // e.g., "Mathematics (Analysis)"
  code: { type: String, unique: true },   // e.g., "MATH"
  
  // Link to the Teacher who teaches this
  teacher: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', // Refers to the base User model (specifically a Teacher)
    required: true 
  },
  hourly_volume:{
    type:Number,
    required:true,
    default :42
  },
  
  // The crucial elimination limit
  maxAbsencesLimit: { 
    type: Number, 
    required: true, 
    default: 3 
  }, // e.g., eliminated after 3 unjustified absences
  
  description: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Subject', subjectSchema);