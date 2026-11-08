const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

const SYSTEM_PROMPT = 'Ты — Nova AI, дружелюбный и умный AI-ассистент. Отвечай на русском языке, кратко но содержательно. Используй markdown для форматирования. Будь полезным и всегда старайся помочь.';

app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Цепочка: локальный прокси DeepSeek → официальный API → бесплатный Pollinations
async function getAIReply(messages) {
  const apiMessages = [{ role: 'system', content: SYSTEM_PROMPT }, ...messages];

  // 1) Локальный FreeDeepseekAPI прокси (бесплатный DeepSeek, работает только на своём ПК)
  if (process.env.USE_LOCAL_PROXY !== '0') {
    try {
      const r = await fetch('http://localhost:9655/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'deepseek-chat', messages: apiMessages, stream: false })
      });
      if (r.ok) {
        const d = await r.json();
        const reply = d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content;
        if (reply) return reply;
      }
    } catch (e) { /* прокси недоступен — идём дальше */ }
  }

  // 2) Официальный DeepSeek API (если задан ключ с балансом)
  if (process.env.DEEPSEEK_API_KEY) {
    try {
      const r = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + process.env.DEEPSEEK_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ model: 'deepseek-chat', messages: apiMessages, max_tokens: 1024, temperature: 0.7 })
      });
      if (r.ok) {
        const d = await r.json();
        const reply = d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content;
        if (reply) return reply;
      }
    } catch (e) { /* fallback */ }
  }

  // 3) Бесплатный Pollinations AI (без ключа)
  try {
    const r = await fetch('https://text.pollinations.ai/openai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'openai', messages: apiMessages })
    });
    if (r.ok) {
      const d = await r.json();
      const reply = d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content;
      if (reply) return reply;
    }
  } catch (e) { /* ignore */ }

  return null;
}

app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Неверный формат сообщений' });
  }

  try {
    const reply = await getAIReply(messages);
    if (!reply) return res.status(502).json({ error: 'AI временно недоступен, попробуйте позже' });
    res.json({ reply });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.listen(PORT, () => {
  console.log('Nova AI server: http://localhost:' + PORT);
});
