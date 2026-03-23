const mongoose = require('mongoose');

const enrollmentSchema = new mongoose.Schema({
  
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    default: null // null until the student creates an account
  },

  
  nationalId: {
    type: String,
    required: true,
    index: true
  },

  
  programCode: {
    type: String,
    required: true
  },

  academicYear: {
    type: String,
    required: true
  },

  semester: {
    type: String,
    enum: ['S1', 'S2', 'Annual'],
    required: true
  },


  status: {
    type: String,
    enum: ['active', 'suspended', 'graduated', 'repeating'],
    default: 'active'
  }

}, { timestamps: true });



enrollmentSchema.index(
  { nationalId: 1, academicYear: 1 },
  { unique: true }
);

module.exports = mongoose.model('Enrollment', enrollmentSchema);