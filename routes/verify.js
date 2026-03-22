const express = require('express');
const router = express.Router();
const { Student } = require('../models/Roles'); // Use the new Student model

// Function to safely render a verification page (optional)
async function sendVerificationPage(res, filename) {
    try {
        res.status(200).render('verification_pages/' + filename);
    } catch (error) {
        console.error("Error rendering verification page:", error);
        res.status(500).send('<h1>Server Error: Page Not Found</h1>');
    }
}

// GET /verify/:token
router.get('/:token', async (req, res) => {
    try {
        const student = await Student.findOne({ verificationToken: req.params.token });

        if (!student) {
            return res.status(400).send(`
                <h2 style="color:red; text-align:center; margin-top:50px;">
                    Invalid or expired verification link.
                </h2>
            `);
        }

        // Verify the account
        student.isVerified = true;
        student.verificationToken = undefined;
        await student.save();

        // Respond with success page
        return res.status(200).send(`
            <div style="text-align:center; font-family:sans-serif; margin-top:50px;">
                <h2 style="color:green;">✅ Your student account has been successfully verified!</h2>
                <p>You can now return to the portal to request your documents.</p>
                <a href="/" style="padding:10px 20px; background:#2c3e50; color:white; text-decoration:none; border-radius:5px;">
                    Back to Portal
                </a>
            </div>
        `);

    } catch (err) {
        console.error("Verification Error:", err);
        return res.status(500).send(`
            <h2 style="text-align:center; margin-top:50px;">
                Server error occurred during verification.
            </h2>
        `);
    }
});

module.exports = router;