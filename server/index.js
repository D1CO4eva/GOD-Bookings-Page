import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
app.use(express.json({ limit: '1mb' }));

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;
const APPS_SCRIPT_GET_TOKEN = process.env.APPS_SCRIPT_GET_TOKEN;
const APPS_SCRIPT_POST_TOKEN = process.env.APPS_SCRIPT_POST_TOKEN;

const missingEnv = () =>
  !APPS_SCRIPT_URL || !APPS_SCRIPT_GET_TOKEN || !APPS_SCRIPT_POST_TOKEN;

app.get('/api/bookings', async (_req, res) => {
  if (missingEnv()) {
    return res.status(500).json({ error: 'Server is missing required secrets.' });
  }

  try {
    const readUrl = new URL(APPS_SCRIPT_URL);
    readUrl.searchParams.set('token', APPS_SCRIPT_GET_TOKEN);

    const response = await fetch(readUrl.toString(), {
      method: 'GET',
      cache: 'no-cache'
    });

    const text = await response.text();
    res.status(response.ok ? 200 : response.status).type('application/json').send(text);
  } catch (error) {
    console.error('Read error:', error);
    res.status(500).json({ error: 'Failed to load bookings.' });
  }
});

app.post('/api/bookings', async (req, res) => {
  if (missingEnv()) {
    return res.status(500).json({ error: 'Server is missing required secrets.' });
  }

  try {
    const payload = {
      ...req.body,
      token: APPS_SCRIPT_POST_TOKEN
    };

    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const text = await response.text();
    res.status(response.ok ? 200 : response.status).type('application/json').send(text);
  } catch (error) {
    console.error('Write error:', error);
    res.status(500).json({ error: 'Failed to submit booking.' });
  }
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, '..', 'dist');

app.use(express.static(distPath));
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
