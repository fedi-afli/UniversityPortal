const mongoose = require('mongoose');

const absenceSchema = new mongoose.Schema({
  // Who was absent?
  student: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  
  
  
  // When?
  date: { type: Date, required: true },
  startTime: { type: String, required: true }, // e.g., "08:30"
  endTime: { type: String, required: true },   // e.g., "10:00"

  
}, { timestamps: true });

module.exports = mongoose.model('Elimination', absenceSchema);