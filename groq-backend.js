const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

app.post('/ask-groq', async (req, res) => {
  const { question } = req.body;
  try {
    const groqRes = await axios.post(
      'https://api.groq.com/v1/chat/completions',
      {
        model: 'llama-3-70b-8192',
        messages: [{ role: 'user', content: question }]
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    res.json({ answer: groqRes.data.choices[0].message.content });
  } catch (err) {
    res.status(500).json({ error: 'Groq API error', details: err.message });
  }
});

app.listen(3001, () => console.log('Groq backend running on port 3001'));