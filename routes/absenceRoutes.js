const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const absenceController = require('../controllers/absenceConroller');

router.get('/', authMiddleware, async (req, res) => {
  try {
    const user=req.user;
    const studentId = user._id;

    // CALL the controller function
    const { totalHours, justifiedHours, unjustifiedHours } =
      await absenceController.getStudentAbsenceHours(studentId);
    const absences=await absenceController.getStudentAbsences(studentId);
    console.log(absences) 

    // Render EJS template
    res.render('absence', { user,totalHours, justifiedHours, unjustifiedHours ,absences});
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

module.exports = router;
router.get(
  "/absences",
  authMiddleware,
  absenceController.getStudentAbsenceHours
);
module.exports = router;