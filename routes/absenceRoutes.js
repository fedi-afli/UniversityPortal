const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const authMiddleware = require('../middleware/authMiddleware');
const absenceController = require('../controllers/absenceConroller'); // Fixed typo
const { ask_agent } = require('../services/aiJustifyAgent');
const Absence = require('../models/Absence');
const { sendJustificationConfirmation } = require('../routes/email');
const Elimination = require('../models/Eliminations');


const uploadDir = path.join(__dirname, '../public/uploads/justification/');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}



router.get('/', authMiddleware, async (req, res) => {
     try {
        


    } catch (error) {
        res.status(500).json({ message: error.message });
    }
  try {
    const user=req.user;
    const studentId = user._id;
    const global_eliminations = await Elimination.find({
            student: new mongoose.Types.ObjectId(studentId)
        });
    console.log(global_eliminations)

    // CALL the controller function
    const { totalHours, justifiedHours, unjustifiedHours } =
      await absenceController.getStudentAbsenceHours(studentId);
    const absences=await absenceController.getStudentAbsences(studentId);
    const elimination_analysis=await absenceController.getStudentAbsencesBySubject(studentId);

    // Render EJS template
    res.render('absence', { user,totalHours, justifiedHours, unjustifiedHours ,absences,global_eliminations,elimination_analysis,aiResponse: null,statusMessage: null});
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

router.post('/justify', authMiddleware, upload.single('certificate'), async (req, res) => {
    const student = req.user;
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    console.log(" FILE SAVED INITIALLY AT:", req.file.path);

    try {
        const imagePath = path.resolve(req.file.path);
        const studentFullName = `${student.firstName} ${student.lastName}`;
        const aiResult = await ask_agent(imagePath, studentFullName);

        let dbMessage = "Certificate analyzed, but no valid justification period was found.";
        let success = false;

        if (aiResult.valid && aiResult.isStudentMatch === false) {
     
            if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            console.log("File deleted: Name mismatch.");

            return res.json({
                aiResponse: `I found a certificate for "${aiResult.patientName}", but your profile name is "${studentFullName}".`,
                statusMessage: "Name mismatch error. Document rejected.",
                success: false
            });
        }

        if (aiResult.valid && aiResult.startDate && aiResult.endDate) {
            const start = new Date(aiResult.startDate);
            start.setUTCHours(0, 0, 0, 0);
            const end = new Date(aiResult.endDate);
            end.setUTCHours(23, 59, 59, 999);

            const query = {
                student: new mongoose.Types.ObjectId(student._id),
                date: { $gte: start, $lte: end },
                isJustified: false
            };

            const absencesToJustify = await Absence.find(query).populate('subject');

            if (absencesToJustify.length > 0) {
                const subjectNames = [...new Set(absencesToJustify.map(a => a.subject?.name || 'Unknown Subject'))];

                const result = await Absence.updateMany(query, {
                    $set: {
                        isJustified: true,
                        justificationDocumentUrl: `/uploads/justification/${req.file.filename}`,
                        updatedAt: new Date()
                    }
                });

                dbMessage = `Success! ${result.modifiedCount} absence(s) justified.`;
                success = true;
                
                try {
                    await sendJustificationConfirmation(student.email, student.firstName || student.prenom, aiResult, dbMessage, subjectNames);
                } catch (mailError) {
                    console.error("Email failed:", mailError);
                }
            } else {
                dbMessage = `No unjustified absences found between ${aiResult.startDate} and ${aiResult.endDate}.`;
            }
        }

      
        if (!success && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
            console.log(" File deleted: No absences justified or invalid document.");
        }

        res.json({
            aiResponse: aiResult.chatMessage,
            statusMessage: dbMessage,
            success: success
        });

    } catch (error) {
        
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
            console.log(" File deleted: Server/AI Error.");
        }
        console.error("AI processing failed:", error);
        res.status(500).json({ error: 'AI processing failed' });
    }
});

router.get("/elimination", authMiddleware, async (req, res) => {
    try {
        const studentId = req.user._id;

        const eliminations = await Elimination.find({
            student: new mongoose.Types.ObjectId(studentId)
        });

        res.status(200).json(eliminations);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});
module.exports = router;