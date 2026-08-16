const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const fs = require('fs/promises');
const { google } = require('googleapis');

const app = express();
const PORT = 5174;
const DATA_PATH = path.join(__dirname, "data", "library.json");

app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());

async function readLib() {
  try {
    return JSON.parse(await fs.readFile(DATA_PATH, "utf8") || "[]");
  } catch {
    return [];
  }
}

async function writeLib(arr) {
  const tmp = DATA_PATH + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(arr, null, 2), "utf8");
  await fs.rename(tmp, DATA_PATH);
}

function dedupeExercises(arr) {
  const seen = new Map();
  return arr.reverse().filter(item => {
    const key = item.id || item.image;
    if (seen.has(key)) return false;
    seen.set(key, true);
    return true;
  }).reverse();
}

app.get('/api/library', async (req, res) => {
  console.log('GET /api/library');
  const data = await readLib();
  res.json(data);
});

app.post('/api/library', async (req, res) => {
  console.log('POST /api/library');
  const items = Array.isArray(req.body.items) ? req.body.items : [req.body];
  const current = await readLib();

  const withIds = items.map(item => ({
    ...item,
    id: item.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`
  }));

  const merged = dedupeExercises([...current, ...withIds]);
  await writeLib(merged);
  res.json(merged);
});

app.put('/api/library', async (req, res) => {
  console.log('PUT /api/library');
  if (!Array.isArray(req.body)) {
    return res.status(400).json({ error: 'Expected array' });
  }
  await writeLib(req.body);
  res.json(req.body);
});

app.patch('/api/library/:id', async (req, res) => {
  console.log('PATCH /api/library/:id');
  const data = await readLib();
  const idx = data.findIndex(x => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });

  data[idx] = { ...data[idx], ...req.body };
  await writeLib(data);
  res.json(data);
});

app.delete('/api/library/:id', async (req, res) => {
  console.log('DELETE /api/library/:id');
  const data = await readLib();
  const filtered = data.filter(x => x.id !== req.params.id);
  await writeLib(filtered);
  res.json(filtered);
});

async function getSheetsClient() {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL || process.env.REACT_APP_GOOGLE_CLIENT_EMAIL;
  const privateKey = (process.env.GOOGLE_PRIVATE_KEY || process.env.REACT_APP_GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

  if (!clientEmail || !privateKey) {
    throw new Error("Missing Google Service Account credentials (GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY)");
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return google.sheets({ version: 'v4', auth });
}

app.get('/api/sheets/read', async (req, res) => {
  console.log('GET /api/sheets/read');
  const { spreadsheetId, range, teamId } = req.query;
  if (!spreadsheetId || !range) {
    return res.status(400).json({ error: 'Missing spreadsheetId or range' });
  }

  try {
    const sheets = await getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });
    // The explicit teamId allows this proxy to be tied to a team logically
    res.json({ values: response.data.values, teamId });
  } catch (err) {
    console.error("GOOGLE SHEETS API ERROR DETAILS:", err.response ? err.response.data : err);
    res.status(500).json({
      error: 'Failed to read from Google Sheets API',
      details: err.response?.data?.error || err.message
    });
  }
});

app.post('/api/sheets/write', async (req, res) => {
  console.log('POST /api/sheets/write');
  const { spreadsheetId, range, values, teamId } = req.body;
  if (!spreadsheetId || !range || !values) {
    return res.status(400).json({ error: 'Missing spreadsheetId, range, or values' });
  }

  try {
    const sheets = await getSheetsClient();
    const response = await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values },
    });
    res.json({ ...response.data, teamId });
  } catch (err) {
    console.error("GOOGLE SHEETS API ERROR DETAILS:", err.response ? err.response.data : err);
    res.status(500).json({
      error: 'Failed to write to Google Sheets API',
      details: err.response?.data?.error || err.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Library server running on port ${PORT}`);
});
