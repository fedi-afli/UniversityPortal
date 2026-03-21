require('dotenv').config();
const mongoose = require('mongoose');
const { processAttestationRequest } = require('./services/attestationService');
processAttestationRequest('69bea61de24da3803511402a');
const uri = process.env.MONGODB_URI;

console.log("URI utilisée :", uri ? "présente" : "MANQUANTE");

mongoose.connect(uri)
  .then(async () => {
    console.log("Connexion réussie à MongoDB Atlas !");

    const count = await mongoose.connection.db.collection('etudiants').countDocuments();
    console.log(`Nombre d'étudiants dans la collection : ${count}`);

    const result = await mongoose.connection.db.collection('etudiants').insertOne({
      cin: "99999999",
      nom: "TestConnexion",
      prenom: "Réussie",
      email: "test@connexion.tn",
      created_at: new Date()
    });

    console.log("Nouvel étudiant inséré avec _id :", result.insertedId);

    const lastStudents = await mongoose.connection.db.collection('etudiants')
      .find({})
      .sort({ created_at: -1 })
      .limit(3)
      .toArray();

    console.log("3 derniers étudiants :");
    console.log(lastStudents);
  })
  .catch(err => {
    console.error("Échec connexion :", err.message);
  })
  .finally(() => {
    // mongoose.connection.close(); 
  });