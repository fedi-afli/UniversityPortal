const mongoose = require('mongoose');
const User = require('./User'); // Import the base model

// --- STUDENT MODEL ---
const studentSchema = new mongoose.Schema({
  studentId: { type: String, unique: true, sparse: true },    // Formerly numero_inscription
  nationalId: { type: String, required: true, unique: true }, // Formerly cin

  inscription: { type: String, sparse: true },

          // Formerly cne
  major: { type: String }, // e.g., "Computer Science" (Formerly filiere)
  level: { type: String }, // e.g., "Year 3" or "L3" (Formerly niveau)
});

// Create the discriminator
const Student = User.discriminator('Student', studentSchema);

// --- TEACHER MODEL ---
const teacherSchema = new mongoose.Schema({
  employeeId: { type: String, unique: true, sparse: true }, // Formerly matricule_prof
  department: { type: String },
  specialty: { type: String }
});

const Teacher = User.discriminator('Teacher', teacherSchema);

module.exports = { Student, Teacher };