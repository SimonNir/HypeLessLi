const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

app.post('/ask-groq', async (req, res) => {
  const { question } = req.body;
  console.log('[ask-groq] Received question:', question);

  try {
    console.log('[ask-groq] Sending request to Groq API...');
    const groqRes = await axios.post(
    'https://api.groq.com/openai/v1/chat/completions',
    {
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: question }]
    },
    {
        headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
        }
    }
    );
    console.log('[ask-groq] Groq API response status:', groqRes.status);
    if (groqRes.data && groqRes.data.choices && groqRes.data.choices[0]) {
      console.log('[ask-groq] Groq API answer:', groqRes.data.choices[0].message.content.slice(0, 100), '...');
    } else {
      console.log('[ask-groq] Groq API response missing expected data:', groqRes.data);
    }
    res.json({ answer: groqRes.data.choices[0].message.content });
  } catch (err) {
    console.error('[ask-groq] Error from Groq API:', err.response ? err.response.data : err.message);
    res.status(500).json({ error: 'Groq API error', details: err.message });
  }
});

app.listen(3001, () => console.log('Groq backend running on port 3001'));