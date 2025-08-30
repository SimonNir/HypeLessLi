const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();


const app = express();
app.use(cors());
app.use(express.json());

// In-memory history of last 7 Q&A
const aiHistory = [];

app.post('/ask-groq', async (req, res) => {
  const { question } = req.body;
  console.log('[ask-groq] Received question:', question);

  // System prompt for Groq
  const systemPrompt = `You are HypeLessLi, an assistant that helps users critically read scientific texts by highlighting hype-like, subjective, promotional, and vague terms in yellow. You provide clear, concise explanations for why a term is considered hype, and always suggest less hyped, more objective alternatives for any term or phrase the user asks about. If the user does not specify, always include a suggestion for a more objective or neutral alternative.`;

  try {
    console.log('[ask-groq] Sending request to Groq API...');
    const groqRes = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('[ask-groq] Groq API response status:', groqRes.status);
    let answer = '';
    if (groqRes.data && groqRes.data.choices && groqRes.data.choices[0]) {
      answer = groqRes.data.choices[0].message.content;
      console.log('[ask-groq] Groq API answer:', answer.slice(0, 100), '...');
    } else {
      console.log('[ask-groq] Groq API response missing expected data:', groqRes.data);
      answer = '[No answer returned]';
    }
    // Add to history (keep only last 7)
    aiHistory.push({ question, answer, ts: new Date().toISOString() });
    if (aiHistory.length > 7) aiHistory.shift();
    res.json({ answer });
  } catch (err) {
    console.error('[ask-groq] Error from Groq API:', err.response ? err.response.data : err.message);
    res.status(500).json({ error: 'Groq API error', details: err.message });
  }
// Endpoint to get last 7 Q&A
app.get('/ask-groq/history', (req, res) => {
  res.json({ history: aiHistory });
});
});

app.listen(3001, () => console.log('Groq backend running on port 3001'));