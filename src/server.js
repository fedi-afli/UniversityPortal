require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const attestationRoutes = require('./routes/attestationRoutes');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/api/auth', authRoutes);
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connecté'))
  .catch(err => console.error('MongoDB erreur', err));

app.use('/api/attestations', attestationRoutes);
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
