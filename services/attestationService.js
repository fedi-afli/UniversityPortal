const Absence = require('../models/Absence');
const Enrollment = require('../models/Enrollment');
const AttestationRequest = require('../models/AttestationRequest');
const User = require('../models/User');

const { generateAttestationPDF } = require('./pdfService');
const { sendAttestationReadyEmail, sendAttestationRejectedEmail } = require('./emailService');

// Dictionary of standard academic dates
const SEMESTER_DATES = {
    "2023-2024": {
        "S1": { start: "2023-09-01", end: "2024-01-31" },
        "S2": { start: "2024-02-01", end: "2024-06-30" }
    },
    "2024-2025": {
        "S1": { start: "2024-09-01", end: "2025-01-31" },
        "S2": { start: "2025-02-01", end: "2025-06-30" }
    }
};

function getStandardSemesterDates(academicYear, semester) {
    // 1. Check if we have exact hardcoded dates first
    if (SEMESTER_DATES[academicYear] && SEMESTER_DATES[academicYear][semester]) {
        return SEMESTER_DATES[academicYear][semester];
    }

    // 2. Dynamic Fallback: If not found, calculate standard dates dynamically
    try {
        const startYear = parseInt(academicYear.split('-')[0]); 
        const endYear = startYear + 1; 

        if (semester === "S1") {
            return {
                start: `${startYear}-09-01`, 
                end: `${endYear}-01-31`      
            };
        } else if (semester === "S2") {
            return {
                start: `${endYear}-02-01`,   
                end: `${endYear}-06-30`      
            };
        }
    } catch (e) {
        return null; 
    }

    return null;
}

function parseTime(t) {
    if (!t || !t.includes(':')) return null;
    const [h, m] = t.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
}

// Unified core function for both Web UI and AI Tool
async function processAttestation({ studentId, academicYear, semester, periodStart, periodEnd }) {
    try {
        // 1. Smart Date Resolution
        let finalStartDate = periodStart;
        let finalEndDate = periodEnd;

        // If dates aren't provided, look them up
        if (!finalStartDate || !finalEndDate) {
            const defaultDates = getStandardSemesterDates(academicYear, semester);
            if (!defaultDates) {
                return { 
                    status: 'error', 
                    reason: `Cannot automatically determine dates for ${academicYear} ${semester}.`, 
                    success: false,
                    email_sent: false
                };
            }
            finalStartDate = defaultDates.start;
            finalEndDate = defaultDates.end;
        }

        const startDate = new Date(finalStartDate);
        const endDate = new Date(finalEndDate);
        
        if (isNaN(startDate) || isNaN(endDate) || endDate <= startDate) {
            return { status: 'error', reason: 'Invalid period dates', success: false, email_sent: false };
        }

        // 2. Fetch Student & Enrollment
        const student = await User.findById(studentId);
        if (!student) return { status: 'error', reason: 'Student not found', success: false, email_sent: false };

        const enrollment = await Enrollment.findOne({
            student: student._id,
            academicYear,
            semester,
            status: 'active'
        });

        if (!enrollment) {
            await sendAttestationRejectedEmail(student, "Your enrollment is not active for this period.");
            return { status: 'rejected', reason: 'No active enrollment', success: false, email_sent: true };
        }

        // 3. Calculate Limits
        const diffDays = (endDate - startDate) / (1000 * 60 * 60 * 24);
        const weeks = diffDays / 7;

        if (weeks <= 0) return { status: 'rejected', reason: 'Period too short', success: false, email_sent: false };

        const totalScheduledHours = weeks * 50; 
        const maxAllowed = totalScheduledHours * 0.2;

        // 4. Calculate Absences
        const absences = await Absence.find({
            student: student._id,
            isJustified: false,
            date: { $gte: startDate, $lte: endDate }
        });

        let totalUnjustifiedHours = 0;
        absences.forEach(abs => {
            const start = parseTime(abs.startTime);
            const end = parseTime(abs.endTime);
            if (start !== null && end !== null && end > start) {
                totalUnjustifiedHours += (end - start) / 60;
            }
        });

        // 5. Decision Logic
        if (totalUnjustifiedHours >= maxAllowed) {
            const reason = `Absence limit exceeded: ${totalUnjustifiedHours.toFixed(1)}h (Max: ${maxAllowed.toFixed(1)}h)`;
            await sendAttestationRejectedEmail(student, reason);
            return { 
                status: 'rejected', 
                reason: reason, 
                success: false, 
                email_sent: true,
                unjustifiedHours: totalUnjustifiedHours, 
                maxAllowed 
            };
        }

        // 6. Save & Generate PDF (Success Case)
        const request = new AttestationRequest({
            student: student._id,
            enrollment: enrollment._id,
            annee_universitaire: academicYear,
            semestre: semester,
            periode_debut: startDate,
            periode_fin: endDate,
            statut: 'approved'
        });

        await request.save();

        const pdfPath = await generateAttestationPDF(request, student, enrollment);
        request.file_path = pdfPath;
        request.date_generation = new Date();
        await request.save();

        await sendAttestationReadyEmail(student, pdfPath);

        // Final Return Object formatting as requested
        return {
            status: 'approved',
            reason: 'Valid attendance',
            success: true,
            requestId: request._id,
            email_sent: true
        };

    } catch (err) {
        console.error('Service error:', err);
        return { status: 'error', reason: 'Internal server error', success: false, email_sent: false };
    }
}

module.exports = { processAttestation };