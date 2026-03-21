const axios = require('axios');

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';

async function askOllama(prompt, model = process.env.OLLAMA_MODEL) {
  try {
    const response = await axios.post(`${OLLAMA_URL}/api/chat`, {
      model,
      messages: [
        { role: 'system', content: 'Tu es un agent universitaire poli et précis spécialisé dans les attestations de présence.' },
        { role: 'user', content: prompt }
      ],
      stream: false
    });

    return response.data.message.content;
  } catch (err) {
    console.error('Ollama erreur:', err.message);
    throw new Error('Problème de communication avec Ollama');
  }
}

module.exports = { askOllama };