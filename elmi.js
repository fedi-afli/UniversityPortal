const mongoose = require('mongoose');
const Elimination = require('./models/Eliminations'); // adjust path if needed

async function seed() {
    try {
        await mongoose.connect("mongodb+srv://tharaaoueslati_db_user:Tharaa123@cluster0.mekaosg.mongodb.net/university?retryWrites=true&w=majority");

        const userId = new mongoose.Types.ObjectId('69c11014bcdc618bcd6b6520');

        const elimination = new Elimination({
            student: userId,
           
            date: new Date('2026-04-17'),
            startTime: "08:30",
            endTime: "10:00"
        });

        await elimination.save();

        console.log("Elimination seeded successfully");
        process.exit();
    } catch (err) {
        console.error("Seed error:", err);
        process.exit(1);
    }
}

seed();