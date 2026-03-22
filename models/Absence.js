const mongoose = require('mongoose');

const absenceSchema = new mongoose.Schema({
  // Who was absent?
  student: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  
  // From what class?
  subject: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Subject', 
    required: true 
  },
  
  // When?
  date: { type: Date, required: true },
  startTime: { type: String, required: true }, // e.g., "08:30"
  endTime: { type: String, required: true },   // e.g., "10:00"
  
  // Type of session
  sessionType: { 
    type: String, 
    enum: ['Lecture', 'Tutorial', 'Lab', 'Exam'], // Replaced TD/TP with Tutorial/Lab
    default: 'Lecture' 
  },
  
  // Justification logic 
  isJustified: { type: Boolean, default: false },
  justificationDocumentUrl: { type: String }, // Link to the uploaded medical cert
  
}, { timestamps: true });

module.exports = mongoose.model('Absence', absenceSchema);