require('dotenv').config();
const jwt = require('jsonwebtoken');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');             
const cookieParser = require('cookie-parser');
const authMiddleware = require('./middleware/authMiddleware');
const pagesRoutes = require('./routes/pages');
const authRoutes = require('./routes/authRoutes');
const attestationRoutes = require('./routes/attestationRoutes'); 
const signupRoute = require('./routes/signup');
const signinRoute = require('./routes/signin');
const logoutRoute = require('./routes/logout');
const passwordRoutes = require('./routes/password');  
const verifyRoutes = require('./routes/verify');     
const absenceRoutes = require('./routes/absenceRoutes');    
const chatRoutes = require('./routes/chatRoutes');
const assitantRoutes=require("./routes/aihelperRoute")
const toolsRoutes=require("./routes/tools");
const internshipRoutes=require("./routes/internships");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use('/uploads', express.static('uploads'));
app.use(express.static('public'));
// Route principale : Portail ou Login
// Change your root route to this:
app.get('/', authMiddleware, (req, res) => {

    return res.render('main', { user: req.user || null });
});
// Routes API et pages
app.use('/', pagesRoutes);
app.use('/api/auth', authRoutes);
app.use('/signup', signupRoute);   
app.use('/signin', signinRoute);    
app.use('/logout', logoutRoute);
app.use('/password', passwordRoutes);
app.use('/verify', verifyRoutes);
app.use('/api/absence', absenceRoutes);
app.use('/api/attestations', attestationRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/assistantAgent',assitantRoutes)
app.use("/api/tools",toolsRoutes)
app.use("/api/internships",internshipRoutes)

// Connexion MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connecté'))
  .catch(err => console.error('MongoDB erreur', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});