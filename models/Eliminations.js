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

  
}, { timestamps: true });

module.exports = mongoose.model('Absence', absenceSchema);