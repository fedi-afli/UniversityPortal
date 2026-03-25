const mongoose = require('mongoose');
const Subject = require('./models/Subject');
const User = require('./models/User'); // adjust path if needed

const MONGO_URI="mongodb+srv://tharaaoueslati_db_user:Tharaa123@cluster0.mekaosg.mongodb.net/university?retryWrites=true&w=majority"


const subjectsList = [
  'Fouille des Données',
  'PFA',
  'Framework Mobile',
  'Framework Web',
  'Introduction Comptabilité',
  'Heuristique',
  'Traitement Big Data',
  'HPC',
  'Entrepôt de Données',
  'Conception par contrat'
];

// simple function to generate a code from name
const generateCode = (name) => {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase();
};

const seedSubjects = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to DB");

    // ⚠️ get ONE teacher (adjust role field if needed)
    const teacher = await User.findOne({ role: "Teacher" });

    if (!teacher) {
      throw new Error("No teacher found. Create one first.");
    }

    const subjects = subjectsList.map(name => ({
      name,
      code: generateCode(name),
      teacher: teacher._id,
      hourly_volume: 42,
      maxAbsencesLimit: 3,
      description: `${name} course`
    }));

    await Subject.insertMany(subjects, { ordered: false });

    console.log("Subjects seeded successfully");
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

seedSubjects();