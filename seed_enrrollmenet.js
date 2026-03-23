require('dotenv').config();
const mongoose = require('mongoose');

// Enrollment Schema Definition (as provided)
const enrollmentSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', default: null },
  nationalId: { type: String, required: true, index: true },
  programCode: { type: String, required: true },
  academicYear: { type: String, required: true },
  semester: { type: String, enum: ['S1', 'S2', 'Annual'], required: true },
  status: { type: String, enum: ['active', 'suspended', 'graduated', 'repeating'], default: 'active' }
}, { timestamps: true });

// Ensure uniqueness per student/year
enrollmentSchema.index({ nationalId: 1, academicYear: 1 }, { unique: true });

const Enrollment = mongoose.model('Enrollment', enrollmentSchema);

const enrollments = [
  { "nationalId": "10433218", "programCode": "ENGINEERING_CS", "academicYear": "2024-2025", "semester": "S1", "status": "active" },
  { "nationalId": "19600133", "programCode": "ENGINEERING_CS", "academicYear": "2024-2025", "semester": "S1", "status": "active" },
  { "nationalId": "89083863", "programCode": "ENGINEERING_CS", "academicYear": "2024-2025", "semester": "S1", "status": "active" },
  { "nationalId": "79402654", "programCode": "ENGINEERING_CS", "academicYear": "2024-2025", "semester": "S1", "status": "active" },
  { "nationalId": "23511615", "programCode": "ENGINEERING_CS", "academicYear": "2024-2025", "semester": "S1", "status": "active" },
  { "nationalId": "59407816", "programCode": "ENGINEERING_CS", "academicYear": "2024-2025", "semester": "S1", "status": "active" },
  { "nationalId": "18495931", "programCode": "ENGINEERING_CS", "academicYear": "2024-2025", "semester": "S1", "status": "active" },
  { "nationalId": "03413164", "programCode": "ENGINEERING_CS", "academicYear": "2024-2025", "semester": "S1", "status": "active" },
  { "nationalId": "75255341", "programCode": "ENGINEERING_CS", "academicYear": "2024-2025", "semester": "S1", "status": "active" },
  { "nationalId": "92832764", "programCode": "ENGINEERING_CS", "academicYear": "2024-2025", "semester": "S1", "status": "active" },
  { "nationalId": "83503056", "programCode": "ENGINEERING_CS", "academicYear": "2024-2025", "semester": "S1", "status": "active" },
  { "nationalId": "41395376", "programCode": "ENGINEERING_CS", "academicYear": "2024-2025", "semester": "S1", "status": "active" },
  { "nationalId": "72423884", "programCode": "ENGINEERING_CS", "academicYear": "2024-2025", "semester": "S1", "status": "active" },
  { "nationalId": "96965328", "programCode": "ENGINEERING_CS", "academicYear": "2024-2025", "semester": "S1", "status": "active" },
  { "nationalId": "71012269", "programCode": "ENGINEERING_CS", "academicYear": "2024-2025", "semester": "S1", "status": "active" },
  { "nationalId": "16697848", "programCode": "ENGINEERING_CS", "academicYear": "2024-2025", "semester": "S1", "status": "active" },
  { "nationalId": "01845146", "programCode": "ENGINEERING_CS", "academicYear": "2024-2025", "semester": "S1", "status": "active" },
  { "nationalId": "27048281", "programCode": "ENGINEERING_CS", "academicYear": "2024-2025", "semester": "S1", "status": "active" },
  { "nationalId": "48932528", "programCode": "ENGINEERING_CS", "academicYear": "2024-2025", "semester": "S1", "status": "active" },
  { "nationalId": "80957015", "programCode": "ENGINEERING_CS", "academicYear": "2024-2025", "semester": "S1", "status": "active" },
  { "nationalId": "43039117", "programCode": "ENGINEERING_CS", "academicYear": "2024-2025", "semester": "S1", "status": "active" },
  { "nationalId": "18227824", "programCode": "ENGINEERING_CS", "academicYear": "2024-2025", "semester": "S1", "status": "active" },
  { "nationalId": "89638346", "programCode": "ENGINEERING_CS", "academicYear": "2024-2025", "semester": "S1", "status": "active" },
  { "nationalId": "57871331", "programCode": "ENGINEERING_CS", "academicYear": "2024-2025", "semester": "S1", "status": "active" },
  { "nationalId": "50983930", "programCode": "ENGINEERING_CS", "academicYear": "2024-2025", "semester": "S1", "status": "active" },
  { "nationalId": "10310518", "programCode": "ENGINEERING_CS", "academicYear": "2024-2025", "semester": "S1", "status": "active" },
  { "nationalId": "34738299", "programCode": "ENGINEERING_CS", "academicYear": "2024-2025", "semester": "S1", "status": "active" },
  { "nationalId": "73763116", "programCode": "ENGINEERING_CS", "academicYear": "2024-2025", "semester": "S1", "status": "active" },
  { "nationalId": "56670106", "programCode": "ENGINEERING_CS", "academicYear": "2024-2025", "semester": "S1", "status": "active" },
  { "nationalId": "51333872", "programCode": "ENGINEERING_CS", "academicYear": "2024-2025", "semester": "S1", "status": "active" },
  { "nationalId": "62473178", "programCode": "ENGINEERING_CS", "academicYear": "2024-2025", "semester": "S1", "status": "active" },
  { "nationalId": "10801326", "programCode": "ENGINEERING_CS", "academicYear": "2024-2025", "semester": "S1", "status": "active" },
  { "nationalId": "77360260", "programCode": "ENGINEERING_CS", "academicYear": "2024-2025", "semester": "S1", "status": "active" }
];

async function seedDB() {
  try {
    // Note: Make sure MONGODB_URI in your .env includes the /university db name
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB...");

    // Clear existing enrollments to avoid duplicate errors on re-run
    await Enrollment.deleteMany({});
    console.log("Cleared existing enrollments.");

    await Enrollment.insertMany(enrollments);
    console.log(`${enrollments.length} enrollments inserted successfully!`);

  } catch (err) {
    console.error("Error seeding database:", err);
  } finally {
    mongoose.connection.close();
  }
}

seedDB();