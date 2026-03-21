require('dotenv').config();
const jwt = require('jsonwebtoken');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');             
const cookieParser = require('cookie-parser');
const auth = require('./middleware/auth');
const Etudiant = require('./models/Etudiant');
const authRoutes = require('./routes/authRoutes');
const attestationRoutes = require('./routes/attestationRoutes');
const signupRoute = require('./routes/signup');
const signinRoute = require('./routes/signin');
const logoutRoute = require('./routes/logout');
const passwordRoutes = require('./routes/password');  
const verifyRoutes = require('./routes/verify');       

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static('public'));

// Route principale : Portail ou Login
app.get('/', async (req, res) => {
    try {
        // 1. On cherche le cookie de connexion
        const token = req.cookies?.jwt;

        // 2. Si aucun cookie n'est trouvé, on affiche simplement la page de login
        if (!token) {
            return res.render('login', { message: null });
        }

        // 3. Si un cookie existe, on le décode
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        
        // 4. On cherche l'étudiant dans la base
        const etudiant = await Etudiant.findById(verified.id);
        if (!etudiant) {
            return res.render('login', { message: null });
        }

        // 5. TOUT EST BON ! L'étudiant est connecté, on affiche le portail
        res.render('index', { etudiant: etudiant });

    } catch (err) {
        // Si le cookie est expiré, trafiqué ou invalide, on affiche le login
        console.log("Token invalide ou expiré, retour au login.");
        return res.render('login', { message: null });
    }
});
// Routes API et pages
app.use('/api/auth', authRoutes);
app.use('/signup', signupRoute);   
app.use('/signin', signinRoute);    
app.use('/logout', logoutRoute);
app.use('/password', passwordRoutes);
app.use('/verify', verifyRoutes);
app.use('/api/attestations', attestationRoutes);

// Connexion MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connecté'))
  .catch(err => console.error('MongoDB erreur', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});