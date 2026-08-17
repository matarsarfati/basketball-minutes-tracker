const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs/promises');
const path = require('path');

const app = express();
const PORT = 5174;
const DATA_PATH = path.join(__dirname, "data", "library.json");

app.use(cors({ origin: 'http://localhost:3000' }));
app.use(bodyParser.json());

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

app.listen(PORT, () => {
  console.log(`Library server running on port ${PORT}`);
});
