import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Allow all origins for now, in production restrict to your frontend domain
app.use(express.json({ limit: '50mb' }));

// Proxy endpoint for Gemini Chat
app.post('/api/chat', async (req, res) => {
  try {
    const payload = req.body;
    
    if (!payload || !payload.contents) {
      return res.status(400).json({ error: 'Missing contents in request body' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Server misconfiguration: Missing Gemini API Key' });
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Gemini API Error:', data);
      return res.status(response.status).json(data);
    }

    res.json(data);
  } catch (error) {
    console.error('Server Error:', error);
    res.status(500).json({ error: 'Internal server error processing AI request.' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Sentimo Proxy is running' });
});

app.listen(PORT, () => {
  console.log(`Sentimo Proxy Server running on http://localhost:${PORT}`);
});
