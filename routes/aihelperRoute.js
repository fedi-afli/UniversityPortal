const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const router = express.Router();
const axios = require('axios'); // Ensure axios is installed: npm install axios

// Note: You can add your authMiddleware back here if you want to protect this endpoint!
router.post('/chat', async (req, res) => {
    try {
        const { message, student_id } = req.body;

        // 1. Set the correct HTTP streaming headers for the browser response
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Transfer-Encoding', 'chunked');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // 2. Open a streaming pipeline downstream to your FastAPI endpoint
        const aiServerResponse = await axios({
            method: 'post',
            url: 'http://127.0.0.1:8000/ask',
            data: {
                message: message,
                student_id: student_id
            },
            responseType: 'stream' // Tells Axios to give us the raw data stream chunk-by-chunk
        });

        // 3. Pipe the incoming chunks from Python directly out to your Express frontend response
        // This passes the tokens in real-time straight through your Node server to the client browser!
        aiServerResponse.data.pipe(res);

    } catch (error) {
        console.error('Error proxying streaming chat to AI Agent:', error.message);

        // If an error happens before streaming starts, send back an HTML-formatted error chunk
        if (!res.headersSent) {
            res.status(500).write("<div class='alert alert-danger'>Oops! My neural network is currently down. Please contact the administration.</div>");
            res.end();
        }
    }
});

module.exports = router;