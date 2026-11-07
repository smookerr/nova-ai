const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

const DEEPSEEK_API_KEY = 'free';
const DEEPSEEK_PROXY = 'http://localhost:9655';

app.use(express.json());
app.use(express.static(path.join(__dirname)));

const SYSTEM_PROMPT = 'Ты — Nova AI, дружелюбный и умный AI-ассистент. Отвечай на русском языке, кратко но содержательно. Используй markdown для форматирования. Будь полезным, немного игривым и всегда старайся помочь.';

app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Неверный формат сообщений' });
  }

  try {
    const response = await fetch(DEEPSEEK_PROXY + '/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + DEEPSEEK_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
        max_tokens: 1024,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('DeepSeek API error:', response.status, err);
      return res.status(500).json({ error: 'Ошибка AI API: ' + response.status });
    }

    const data = await response.json();
    const reply = data.choices[0].message.content;
    res.json({ reply });

  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.listen(PORT, () => {
  console.log('Nova AI server: http://localhost:' + PORT);
});