export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages } = req.body || {};
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid messages' });
  }

  const SYSTEM_PROMPT = 'Ты — Nova AI, дружелюбный и умный AI-ассистент. Отвечай на русском языке, кратко но содержательно. Используй markdown для форматирования. Будь полезным и всегда старайся помочь.';
  const apiMessages = [{ role: 'system', content: SYSTEM_PROMPT }, ...messages];

  // 1) Официальный DeepSeek API (если задан ключ с балансом)
  const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY;
  if (DEEPSEEK_KEY) {
    try {
      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + DEEPSEEK_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: apiMessages,
          max_tokens: 1024,
          temperature: 0.7
        })
      });
      if (response.ok) {
        const data = await response.json();
        const reply = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
        if (reply) return res.status(200).json({ reply });
      }
    } catch (e) { /* fallback ниже */ }
  }

  // 2) Бесплатный Pollinations AI (без ключа)
  try {
    const response = await fetch('https://text.pollinations.ai/openai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'openai', messages: apiMessages })
    });
    if (response.ok) {
      const data = await response.json();
      const reply = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
      if (reply) return res.status(200).json({ reply });
    }
  } catch (e) { /* ignore */ }

  return res.status(502).json({ error: 'AI service temporarily unavailable' });
}
