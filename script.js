const canvas = document.getElementById('particles');
const ctx = canvas.getContext('2d');
let particles = [];

function resize() { canvas.width = innerWidth; canvas.height = innerHeight; }
resize();
addEventListener('resize', resize);

class Particle {
  constructor() { this.reset(); }
  reset() {
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
    this.size = Math.random() * 2 + 0.5;
    this.speedX = (Math.random() - 0.5) * 0.4;
    this.speedY = (Math.random() - 0.5) * 0.4;
    this.opacity = Math.random() * 0.5 + 0.1;
  }
  update() {
    this.x += this.speedX;
    this.y += this.speedY;
    if (this.x < 0 || this.x > canvas.width) this.speedX *= -1;
    if (this.y < 0 || this.y > canvas.height) this.speedY *= -1;
  }
  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,212,255,' + this.opacity + ')';
    ctx.fill();
  }
}

for (let i = 0; i < 80; i++) particles.push(new Particle());

function animateParticles() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particles.forEach(p => { p.update(); p.draw(); });
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const dx = particles[i].x - particles[j].x;
      const dy = particles[i].y - particles[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 120) {
        ctx.beginPath();
        ctx.moveTo(particles[i].x, particles[i].y);
        ctx.lineTo(particles[j].x, particles[j].y);
        ctx.strokeStyle = 'rgba(123,47,255,' + (0.08 * (1 - dist / 120)) + ')';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }
  requestAnimationFrame(animateParticles);
}
animateParticles();

const messagesEl = document.getElementById('messages');
const input = document.getElementById('userInput');
const suggestions = document.querySelector('.chat-suggestions');

let chatHistory = [];
let msgCount = 0;

function openChat() {
  document.getElementById('chat').scrollIntoView({ behavior: 'smooth' });
  input.focus();
}

function addMessage(text, isUser) {
  isUser = isUser || false;
  const msg = document.createElement('div');
  msg.className = 'message ' + (isUser ? 'user' : 'ai');

  if (isUser) {
    msg.innerHTML = '<div class="message-bubble user-bubble">' + escapeHtml(text) + '<div class="message-time">сейчас</div></div>';
  } else {
    msg.innerHTML = '<div class="message-avatar"><svg viewBox="0 0 40 40" fill="none"><circle cx="20" cy="20" r="18" stroke="url(#gradAi' + msgCount + ')" stroke-width="2"/><path d="M12 20 C12 14, 28 14, 28 20 C28 26, 12 26, 12 20" stroke="url(#gradAi' + msgCount + ')" stroke-width="2" fill="none"/><circle cx="20" cy="20" r="3" fill="url(#gradAi' + msgCount + ')"/><defs><linearGradient id="gradAi' + msgCount + '" x1="0" y1="0" x2="40" y2="40"><stop offset="0%" stop-color="#00d4ff"/><stop offset="100%" stop-color="#7b2fff"/></linearGradient></defs></svg></div><div class="message-bubble ai-bubble">' + formatText(text) + '<div class="message-time">только что</div></div>';
  }

  messagesEl.appendChild(msg);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  msgCount++;
  return msg;
}

function showTyping() {
  const el = document.createElement('div');
  el.className = 'typing-indicator';
  el.innerHTML = '<span></span><span></span><span></span>';
  messagesEl.appendChild(el);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return el;
}

async function sendMessage() {
  const text = input.value.trim();
  if (!text) return;

  addMessage(text, true);
  chatHistory.push({ role: 'user', content: text });
  input.value = '';
  input.style.height = 'auto';
  suggestions.style.display = 'none';

  const typing = showTyping();

  const systemMsg = { role: 'system', content: 'Ты — Nova AI, дружелюбный умный ассистент. Отвечай на русском языке, кратко но содержательно. Используй markdown.' };
  const apiMessages = [systemMsg, ...chatHistory];

  let reply = null;

  // 1) Попытка через свой сервер (локально / Vercel)
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: chatHistory })
    });
    if (response.ok) {
      const data = await response.json();
      if (data.reply) reply = data.reply;
    }
  } catch (e) { /* сервера нет — идём дальше */ }

  // 2) Fallback: бесплатный Pollinations AI (работает из браузера, без ключа)
  if (!reply) {
    try {
      const response = await fetch('https://text.pollinations.ai/openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'openai', messages: apiMessages })
      });
      if (response.ok) {
        const data = await response.json();
        reply = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
      }
    } catch (e) { /* ignore */ }
  }

  typing.remove();

  if (reply) {
    chatHistory.push({ role: 'assistant', content: reply });
    addMessage(reply, false);
  } else {
    addMessage('Не удалось получить ответ. Попробуйте ещё раз.', false);
  }
}

function sendSuggestion(btn) {
  input.value = btn.textContent;
  sendMessage();
}

function clearChat() {
  messagesEl.innerHTML = '';
  suggestions.style.display = '';
  chatHistory = [];
  msgCount = 0;
  addMessage('Чат очищен! Чем могу помочь?', false);
}

input.addEventListener('keydown', function(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

input.addEventListener('input', function() {
  input.style.height = 'auto';
  input.style.height = Math.min(input.scrollHeight, 120) + 'px';
});

function escapeHtml(t) {
  return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function formatText(t) {
  return escapeHtml(t)
    .replace(/```([\s\S]*?)```/g, '<pre style="background:rgba(0,0,0,.3);padding:.8rem;border-radius:8px;overflow-x:auto;margin:.5rem 0"><code>$1</code></pre>')
    .replace(/`([^`]+)`/g, '<code style="background:rgba(0,212,255,.1);padding:.15rem .4rem;border-radius:4px;color:#00d4ff">$1</code>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^### (.*$)/gm, '<h4 style="margin:.5rem 0 .3rem;color:#00d4ff">$1</h4>')
    .replace(/^## (.*$)/gm, '<h3 style="margin:.6rem 0 .4rem;color:#00d4ff">$1</h3>')
    .replace(/^# (.*$)/gm, '<h3 style="margin:.6rem 0 .4rem;color:#00d4ff">$1</h3>')
    .replace(/\n/g, '<br>');
}

let ticking = false;
addEventListener('scroll', function() {
  if (!ticking) {
    requestAnimationFrame(function() {
      const scrolled = scrollY;
      document.querySelector('.blob-1').style.transform = 'translateY(' + (scrolled * 0.3) + 'px)';
      document.querySelector('.blob-2').style.transform = 'translateY(' + (scrolled * -0.2) + 'px)';
      ticking = false;
    });
    ticking = true;
  }
});

document.querySelectorAll('.nav-link').forEach(function(link) {
  link.addEventListener('click', function(e) {
    e.preventDefault();
    document.querySelectorAll('.nav-link').forEach(function(l) { l.classList.remove('active'); });
    link.classList.add('active');
  });
});