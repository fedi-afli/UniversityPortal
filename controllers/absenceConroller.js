const Absence = require('../models/Absence');
const Subject=require('../models/Subject')

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
const getStudentAbsencesBySubject = async (studentId) => {
  try {
    // Aggregate only **unjustified absences** by subject
    const absencesBySubject = await Absence.aggregate([
      { $match: { student: studentId, isJustified: false } }, // <-- exclude justified
      {
        $group: {
          _id: "$subject",
          numberOfAbsences: { $sum: 1 }
        }
      }
    ]);

    // Fetch subject objects for all _id's
    const subjectIds = absencesBySubject.map(a => a._id);
    const subjects = await Subject.find({ _id: { $in: subjectIds } }).lean();

    // Merge counts with subjects
    const result = absencesBySubject.map(a => {
      const subject = subjects.find(s => s._id.equals(a._id));
      return {
        subject,
        numberOfAbsences: a.numberOfAbsences
      };
    }).filter(Boolean);

    return result;

  } catch (err) {
    console.error("Error in getStudentAbsencesBySubject:", err);
    throw err;
  }
};


module.exports = {
  getStudentAbsenceHours,
  getStudentAbsences,
  getStudentAbsencesBySubject
};