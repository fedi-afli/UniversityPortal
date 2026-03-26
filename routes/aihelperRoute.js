// Ensure you have access to express router
const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const router = express.Router();

router.post('/chat',async (req, res) => {
    try {
        const { message, student_id } = req.body;

        // Forward the JSON payload to your Python AI Agent
        const aiServerResponse = await fetch('http://127.0.0.1:8000/ask', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: message,
                student_id: student_id
            })
        });
       console.log(aiServerResponse)

        if (!aiServerResponse.ok) {
            return res.status(500).json({ 
                response: "Oops! My neural network is currently down. Please contact the administration." 
            });
        }

        // Parse the Python server's JSON response
        const aiData = await aiServerResponse.json();

        // Send it back to the frontend
        res.json(aiData);

    } catch (error) {
        console.error('Error proxying chat to AI Agent:', error);
        res.status(500).json({ 
            response: "Oops! My neural network is currently down. Please contact the administration." 
        });
    }
});

module.exports = router;