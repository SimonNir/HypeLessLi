const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();


const app = express();
app.use(cors());
app.use(express.json());

// In-memory history of last 12 Q&A
const HISTORY_LIMIT = 12;
const aiHistory = [];

app.post('/ask-groq', async (req, res) => {
  const { question } = req.body;
  console.log('[ask-groq] Received question:', question);


  // Improved system prompt for Groq
  const systemPrompt = `You are HypeLessLi, an assistant that helps users critically read scientific texts by highlighting hype-like, subjective, promotional, and vague terms. You provide clear, concise explanations for why a term is considered hype, and always suggest less hyped, more objective alternatives for any term or phrase the user asks about. If the user does not specify, always include a suggestion for a more objective or neutral alternative. If the user asks a follow-up, use the previous questions and answers in this conversation for context. Always try to resolve ambiguous or short follow-ups by referencing the last exchange.`;

  // Helper: is the question a likely follow-up (short or vague)?
  function isLikelyFollowup(q) {
    return q.trim().length < 20 || /^(what|which|and|also|more|how about|the second|the first|that one|this one|another|other|else|too|again|continue|next|previous|last|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|it|he|she|they|him|her|them|those|these|such|so|then|now|why|how|where|when|who|whose|whom|is|are|was|were|do|does|did|can|could|should|would|will|shall|may|might|must|has|have|had|does|did|doesn't|didn't|isn't|aren't|wasn't|weren't|hasn't|haven't|hadn't|won't|wouldn't|can't|couldn't|shouldn't|mightn't|mustn't|doesnt|didnt|isnt|arent|wasnt|werent|hasnt|havent|hadnt|wont|wouldnt|cant|couldnt|shouldnt|mightnt|mustnt)\b/i.test(q.trim());
  }

  // Build chat history for Groq (up to HISTORY_LIMIT)
  let historyPairs = aiHistory.slice(-HISTORY_LIMIT);

  // If the new question is a likely follow-up, prepend the last Q&A as context
  let chatHistory = [ { role: 'system', content: systemPrompt } ];
  if (isLikelyFollowup(question) && historyPairs.length > 0) {
    const last = historyPairs[historyPairs.length - 1];
    chatHistory.push({ role: 'user', content: last.question });
    chatHistory.push({ role: 'assistant', content: last.answer });
  }
  chatHistory = chatHistory.concat(
    historyPairs.flatMap(pair => [
      { role: 'user', content: pair.question },
      { role: 'assistant', content: pair.answer }
    ])
  );
  chatHistory.push({ role: 'user', content: question });

  try {
    console.log('[ask-groq] Sending request to Groq API...');
    const groqRes = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',
        messages: chatHistory
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
  // Add to history (keep only last HISTORY_LIMIT)
  aiHistory.push({ question, answer, ts: new Date().toISOString() });
  if (aiHistory.length > HISTORY_LIMIT) aiHistory.shift();
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