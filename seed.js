const mongoose = require('mongoose');
const { faker } = require('@faker-js/faker'); // modern faker
const Enrollment = require('./models/Enrollment');
require('dotenv').config();

const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) {
  console.error('❌ MONGO_URI not defined in .env');
  process.exit(1);
}

const NUM_ENROLLMENTS = 20;

async function seedEnrollments() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    await Enrollment.deleteMany({});
    console.log('🗑 Existing enrollments cleared');

    const semesters = ['S1', 'S2', 'Annual'];
    const programs = ['CS', 'IT', 'Math', 'Physics', 'Biology'];

    const enrollments = [];

    for (let i = 0; i < NUM_ENROLLMENTS; i++) {
      const nationalId = faker.number.int({ min: 10000000, max: 99999999 }).toString();
      const programCode = programs[Math.floor(Math.random() * programs.length)];
      const academicYear = `${faker.number.int({ min: 2023, max: 2025 })}-${faker.number.int({ min: 2024, max: 2026 })}`;
      const semester = semesters[Math.floor(Math.random() * semesters.length)];

      enrollments.push({
        nationalId,
        programCode,
        academicYear,
        semester
      });
    }

    await Enrollment.insertMany(enrollments);
    console.log(`✅ ${NUM_ENROLLMENTS} enrollments added successfully`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding enrollments:', err);
    process.exit(1);
  }
}

seedEnrollments();