const fs = require('fs');
const pdfParse = require('pdf-parse'); // Corrected import
const { Ollama } = require('ollama');

const ollama = new Ollama({ host: 'http://127.0.0.1:11434' });

async function ask_agent(pdfPath, studentFullName) {
    try {
        console.log("📄 Step 1: Reading digital PDF file...");
        
        // 1. Read the PDF file into a memory buffer
        const dataBuffer = fs.readFileSync(pdfPath);
        
        // 2. Extract the exact text layer from the PDF using pdfParse
        const pdfData = await pdfParse(dataBuffer); // Corrected function call
        const extractedText = pdfData.text.trim();
        
        console.log("PDF Text Extracted. Character Count:", extractedText.length);

        // 3. Catch "Scanned" PDFs (Photos wrapped in a PDF file)
        if (extractedText.length < 20) {
            console.log("⚠️ No digital text found. This is likely a scanned photo.");
            return {
                valid: false,
                chatMessage: "I cannot read scanned images. Please upload a true digital PDF directly from your doctor or clinic."
            };
        }

        // ... inside ask_agent in aiJustifyAgent.js ...
        console.log("🤖 Step 2: Sending perfect text to AI text model...");
        
        const prompt = `
        You are an expert data extraction assistant. Analyze the following perfect text from a digital medical certificate.
        The student submitting this certificate is named: "${studentFullName}".
        
        DOCUMENT TEXT:
        """
        ${extractedText}
        """
        
        TASK:
        1. Verify if the text looks like a valid medical certificate or doctor's note.
        2. Extract the patient's full name from the document.
        3. Compare the extracted patient name with the student's name ("${studentFullName}"). Allow for minor spelling differences or reversed order (e.g., John Doe vs Doe John).
        4. Extract the START date and END date of the advised absence.
        
        STRICT RULES:
        - Format dates exactly as YYYY-MM-DD. Assume year 2024 if not fully specified.
        - If there is only one date (a 1-day absence), startDate and endDate are the same.
        - If it is not a medical document, set "valid": false.
        
        Respond ONLY with a valid JSON object in this exact format:
        {
          "valid": true/false,
          "patientName": "Extracted Patient Name",
          "isStudentMatch": true/false,
          "startDate": "YYYY-MM-DD" (or null if invalid),
          "endDate": "YYYY-MM-DD" (or null if invalid),
          "chatMessage": "A short summary message explaining the result."
        }
        `;

        const response = await ollama.chat({
            model: 'llama3', 
            messages: [{ role: 'user', content: prompt }],
            options: { temperature: 0.0 }
        });
        

        const aiResponseRaw = response.message.content;
        console.log("Raw AI Response:", aiResponseRaw);

        // 5. Robust JSON Extraction
        const jsonMatch = aiResponseRaw.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsedData = JSON.parse(jsonMatch[0]);
            return parsedData;
        }

        throw new Error("No JSON found in AI response");

    } catch (err) {
        console.error("Agent Error:", err);
        return { 
            valid: false, 
            chatMessage: "There was a technical error reading the PDF document. Please try again." 
        };
    }
}

module.exports = { 
    ask_agent
};