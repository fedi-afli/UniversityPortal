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


const uploadDir = path.join(__dirname, '../uploads/certificate/');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}



router.get('/', authMiddleware, async (req, res) => {
  try {
    const user=req.user;
    const studentId = user._id;

    // CALL the controller function
    const { totalHours, justifiedHours, unjustifiedHours } =
      await absenceController.getStudentAbsenceHours(studentId);
    const absences=await absenceController.getStudentAbsences(studentId);
    const elimination_analysis=await absenceController.getStudentAbsencesBySubject(studentId);

    // Render EJS template
    res.render('absence', { user,totalHours, justifiedHours, unjustifiedHours ,absences,elimination_analysis,aiResponse: null,statusMessage: null});
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/certificate/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

router.post('/justify', authMiddleware, upload.single('certificate'), async (req, res) => {
    const student = req.user;
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    try {
        const imagePath = path.resolve(req.file.path);
        const studentFullName = `${student.firstName} ${student.lastName}`;
        const aiResult = await ask_agent(imagePath, studentFullName);

        let dbMessage = "Certificate analyzed, but no valid justification period was found.";
        let success = false;

        if (aiResult.valid && aiResult.isStudentMatch === false) {
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
                // 1. Get unique subject names
                const subjectNames = [...new Set(absencesToJustify.map(a => a.subject?.name || 'Unknown Subject'))];

                // 2. Update DB
                const result = await Absence.updateMany(query, {
                    $set: {
                        isJustified: true,
                        justificationDocumentUrl: `/uploads/certificate/${req.file.filename}`,
                        updatedAt: new Date()
                    }
                });

                dbMessage = `Success! ${result.modifiedCount} absence(s) justified.`;
                success = true;
                
                // 3. Send Email with the subject list
                try {
                    await sendJustificationConfirmation(
                        student.email, 
                        student.firstName || student.prenom, 
                        aiResult, 
                        dbMessage,
                        subjectNames // Pass the array here
                    );
                } catch (mailError) {
                    console.error("Email failed:", mailError);
                }
            } else {
                dbMessage = `No unjustified absences found between ${aiResult.startDate} and ${aiResult.endDate}.`;
            }
        }

        res.json({
            aiResponse: aiResult.chatMessage,
            statusMessage: dbMessage,
            success: success
        });

    } catch (error) {
        console.error("AI processing failed:", error);
        res.status(500).json({ error: 'AI processing failed' });
    }
});

/* module.exports = router;
router.get(
  "/absences",
  authMiddleware,
  absenceController.getStudentAbsenceHours
); */
module.exports = router;