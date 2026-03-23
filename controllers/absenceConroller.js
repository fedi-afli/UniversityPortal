const Absence = require('../models/Absence');
const subject=require('../models/Subject')

/**
 * Controller to get total absence hours for a student
 * Returns an object with total, justified, and unjustified hours
 * Does NOT send res.render() or res.json() — the route handles that
 */
const getStudentAbsenceHours = async (studentId) => {
  console.log("Controller function called for student:", studentId);

  const absences = await Absence.find({ student: studentId });
  console.log("Fetched absences:", absences.length);

  let totalMinutes = 0;
  let justifiedMinutes = 0;
  let unjustifiedMinutes = 0;

  absences.forEach(abs => {
    const [sh, sm] = abs.startTime.split(':').map(Number);
    const [eh, em] = abs.endTime.split(':').map(Number);

    const duration = (eh * 60 + em) - (sh * 60 + sm);
    totalMinutes += duration;

    if (abs.isJustified) justifiedMinutes += duration;
    else unjustifiedMinutes += duration;
  });

  const totalHours = totalMinutes / 60;
  const justifiedHours = justifiedMinutes / 60;
  const unjustifiedHours = unjustifiedMinutes / 60;


  // Return data, route will decide what to do with it
  return { totalHours, justifiedHours, unjustifiedHours };
};





const getStudentAbsences = async (studentId) => {
  
 
  try {
    const absences = await Absence.find({ student: studentId })
      .populate({
        path: 'subject',
        populate: {
          path: 'teacher',
          model: 'User'
        }
      });

    // Format the result
    const formatted = absences.map(abs => ({
      absence: abs,
      teacher: abs.subject?.teacher || null
    }));

    return formatted;

  } catch (err) {
    console.error("Error fetching absences:", err);
    throw err;
  }
};

module.exports = {
  getStudentAbsenceHours,
  getStudentAbsences 
};