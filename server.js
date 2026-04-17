/**
 * AKUH – Backend Server
 * Express.js with endpoints:
 *  POST /api/leads      → simpan lead dari form LP ke JSON DB
 *  GET  /api/leads      → ambil semua leads (protected)
 *  POST /api/track      → server-side event tracking (Meta CAPI, TikTok Events API)
 *  GET  /dashboard      → redirect ke dashboard
 *  POST /api/auth/login → login dashboard
 */

require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'data', 'leads.json');

// ─── Middleware ──────────────────────────────────────────────
app.use(express.json());

// Dynamic serve for index.html to inject Tracking Config from .env
app.get('/', (req, res) => {
  const htmlPath = path.join(__dirname, 'index.html');
  fs.readFile(htmlPath, 'utf8', (err, data) => {
    if (err) return res.status(500).send('Error reading index.html');
    
    const configStr = JSON.stringify({
      gtmId: process.env.GTM_ID || '',
      metaPixel: process.env.META_PIXEL_ID || '',
      tiktokPixel: process.env.TIKTOK_PIXEL_ID || '',
      ga4Id: process.env.GA4_ID || '',
      apiBase: ''
    });

    const replacedText = data.replace(
      /<script>\s*window\.AKUH_CONFIG\s*=\s*\{[\s\S]*?\};\s*<\/script>/i,
      `<script>window.AKUH_CONFIG = ${configStr};</script>`
    );

    res.send(replacedText);
  });
});

app.use(express.static(path.join(__dirname)));

// CORS sederhana (sesuaikan domain production)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// ─── Ensure data directory ───────────────────────────────────
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'));
}
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2));
}

// ─── Helper: read/write JSON DB ─────────────────────────────
function readLeads() {
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch { return []; }
}
function writeLeads(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// ─── Helper: hash phone for CAPI ─────────────────────────────
function sha256(value) {
  return value
    ? crypto.createHash('sha256').update(value.trim().toLowerCase()).digest('hex')
    : null;
}

// ─── Helper: Meta CAPI Server-Side Event ─────────────────────
async function sendMetaCAPI(eventName, userData, customData, eventSourceUrl) {
  if (!process.env.META_PIXEL_ID || !process.env.META_CAPI_TOKEN) return;
  const payload = JSON.stringify({
    data: [{
      event_name: eventName,
      event_time: Math.floor(Date.now() / 1000),
      event_source_url: eventSourceUrl || 'https://akuh.id/',
      action_source: 'website',
      user_data: {
        ph: [sha256(userData.phone)],
        fn: [sha256(userData.firstName)],
        ln: [sha256(userData.lastName)],
        client_ip_address: userData.ip,
        client_user_agent: userData.userAgent,
      },
      custom_data: customData
    }]
  });
  const options = {
    hostname: 'graph.facebook.com',
    path: `/v19.0/${process.env.META_PIXEL_ID}/events?access_token=${process.env.META_CAPI_TOKEN}`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
  };
  return new Promise((resolve) => {
    const req = https.request(options, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve(JSON.parse(body)));
    });
    req.on('error', e => { console.error('[Meta CAPI Error]', e.message); resolve(null); });
    req.write(payload);
    req.end();
  });
}

// ─── Helper: TikTok Events API Server-Side ───────────────────
async function sendTikTokEvent(eventName, userData, properties) {
  if (!process.env.TIKTOK_PIXEL_ID || !process.env.TIKTOK_EVENTS_TOKEN) return;
  const payload = JSON.stringify({
    pixel_code: process.env.TIKTOK_PIXEL_ID,
    event: eventName,
    timestamp: new Date().toISOString(),
    context: {
      user: {
        phone_number: sha256(userData.phone),
        first_name: sha256(userData.firstName),
      },
      ip: userData.ip,
      user_agent: userData.userAgent,
      page: { url: userData.pageUrl || 'https://akuh.id/' }
    },
    properties
  });
  const options = {
    hostname: 'business-api.tiktok.com',
    path: '/open_api/v1.3/event/track/',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Access-Token': process.env.TIKTOK_EVENTS_TOKEN,
      'Content-Length': Buffer.byteLength(payload)
    }
  };
  return new Promise((resolve) => {
    const req = https.request(options, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve(JSON.parse(body)));
    });
    req.on('error', e => { console.error('[TikTok Events Error]', e.message); resolve(null); });
    req.write(payload);
    req.end();
  });
}

// ─── Simple Auth Middleware ──────────────────────────────────
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '');
  const expected = Buffer.from(
    `${process.env.DASHBOARD_USERNAME}:${process.env.DASHBOARD_PASSWORD}`
  ).toString('base64');
  if (token === expected) return next();
  return res.status(401).json({ error: 'Unauthorized' });
}

// ═══════════════════════════════════════════════════════════════
// API ROUTES
// ═══════════════════════════════════════════════════════════════

// POST /api/auth/login
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (
    username === process.env.DASHBOARD_USERNAME &&
    password === process.env.DASHBOARD_PASSWORD
  ) {
    const token = Buffer.from(`${username}:${password}`).toString('base64');
    return res.json({ success: true, token });
  }
  return res.status(401).json({ success: false, message: 'Username atau password salah.' });
});

let waIndex = 0;

// POST /api/leads  – simpan lead dari form LP
app.post('/api/leads', async (req, res) => {
  const { name, phone } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ error: 'Nama dan nomor WA wajib diisi.' });
  }

  const baseLead = {
    ...req.body,
    name: name.trim(),
    phone: phone.trim()
  };

  const lead = {
    ...baseLead,
    id: crypto.randomUUID(),
    targetType: req.body.targetType || '-',
    budget: req.body.budget || '-',
    waktu: req.body.waktu || '-',
    jamaah: req.body.jamaah || 1,
    paspor: req.body.paspor || '-',
    source: req.body.source || 'form',
    pageUrl: req.body.pageUrl || '',
    ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress || '',
    userAgent: req.headers['user-agent'] || '',
    createdAt: new Date().toISOString(),
    status: 'baru'
  };

  const leads = readLeads();
  leads.unshift(lead);
  writeLeads(leads);

  // Fire server-side events in background
  const nameParts = name.trim().split(' ');
  const userData = {
    phone: phone.replace(/\D/g, ''),
    firstName: nameParts[0],
    lastName: nameParts.slice(1).join(' ') || '',
    ip: lead.ip,
    userAgent: lead.userAgent,
    pageUrl: pageUrl
  };

  // Fire & forget – tidak block response
  sendMetaCAPI('Lead', userData, { currency: 'IDR', value: 1, content_name: budget || 'Umrah' }, pageUrl)
    .catch(e => console.error('[CAPI]', e));
  sendTikTokEvent('SubmitForm', userData, { currency: 'IDR', value: 1, description: budget })
    .catch(e => console.error('[TikTok]', e));

  const waNumbersStr = process.env.WA_NUMBERS || '6285710612377';
  const waNumbers = waNumbersStr.split(',').map(n => n.trim()).filter(n => n);
  const waNumber = waNumbers[waIndex % waNumbers.length] || '6285710612377';
  waIndex++;

  return res.json({ success: true, id: lead.id, waNumber, message: 'Lead tersimpan!' });
});

// GET /api/leads  – ambil semua leads (auth required)
app.get('/api/leads', authMiddleware, (req, res) => {
  const leads = readLeads();
  const { status, search, page = 1, limit = 20, sort = 'desc', period = 'all', startDate, endDate } = req.query;

  let filtered = leads;
  
  // Filter by Period
  if (period !== 'all') {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterday = today - (24 * 60 * 60 * 1000);
    const last7days = today - (7 * 24 * 60 * 60 * 1000);

    filtered = filtered.filter(l => {
      const createdAt = new Date(l.createdAt).getTime();
      if (period === 'today') return createdAt >= today;
      if (period === 'yesterday') return createdAt >= yesterday && createdAt < today;
      if (period === '7days') return createdAt >= last7days;
      if (period === 'custom' && startDate) {
        const sTime = new Date(startDate).getTime();
        const eTime = endDate ? new Date(endDate).setHours(23, 59, 59, 999) : new Date().getTime();
        return createdAt >= sTime && createdAt <= eTime;
      }
      return true;
    });
  }

  if (sort === 'asc') filtered = [...filtered].reverse();
  if (status && status !== 'semua') {
    filtered = filtered.filter(l => l.status === status);
  }
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(l =>
      l.name.toLowerCase().includes(q) ||
      l.phone.includes(q) ||
      l.budget?.toLowerCase().includes(q)
    );
  }

  const total = filtered.length;
  const start = (page - 1) * limit;
  const paginated = filtered.slice(start, start + Number(limit));

  res.json({ total, page: Number(page), limit: Number(limit), data: paginated });
});

// GET /api/wilayah – search kecamatan dari data lokal (bundled dari wilayah.id)
// Data diload sekali ke memory saat startup untuk performa maksimal
let allDistricts = [];

function loadDistrictsData() {
  const fullPath = path.join(__dirname, 'data', 'districts.json');
  const fallbackPath = path.join(__dirname, 'data', 'popular_districts.json');
  
  if (fs.existsSync(fullPath)) {
    try {
      allDistricts = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
      console.log(`📍 Loaded ${allDistricts.length} kecamatan dari districts.json`);
      return;
    } catch(e) { console.warn('[wilayah] Gagal load districts.json:', e.message); }
  }

  // Fallback: load popular_districts.json
  if (fs.existsSync(fallbackPath)) {
    try {
      const raw = JSON.parse(fs.readFileSync(fallbackPath, 'utf8'));
      allDistricts = raw.map(name => ({ name, full: name, regency: '', province: '' }));
      console.log(`📍 Fallback: Loaded ${allDistricts.length} kecamatan dari popular_districts.json`);
    } catch(e) { console.warn('[wilayah] Gagal load popular_districts.json:', e.message); }
  }
}
loadDistrictsData();

app.get('/api/wilayah', (req, res) => {
  const q = (req.query.q || '').toLowerCase().trim();
  if (q.length < 3) return res.json({ data: [] });

  // Split query jadi kata-kata (misal "sukabumi cisaat" → cari yg mengandung keduanya)
  const terms = q.split(/\s+/);
  
  const results = allDistricts
    .filter(d => terms.every(term => (d.full || d.name).toLowerCase().includes(term)))
    .slice(0, 15)
    .map(d => ({ name: d.name, full: d.full || d.name, regency: d.regency, province: d.province }));

  res.json({ data: results });
});

// PATCH /api/leads/:id – update status lead
app.patch('/api/leads/:id', authMiddleware, (req, res) => {
  const leads = readLeads();
  const idx = leads.findIndex(l => l.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Lead tidak ditemukan.' });
  leads[idx] = { ...leads[idx], ...req.body, updatedAt: new Date().toISOString() };
  writeLeads(leads);
  res.json({ success: true, data: leads[idx] });
});

// DELETE /api/leads/:id – hapus lead
app.delete('/api/leads/:id', authMiddleware, (req, res) => {
  const leads = readLeads();
  const filtered = leads.filter(l => l.id !== req.params.id);
  if (filtered.length === leads.length) return res.status(404).json({ error: 'Lead tidak ditemukan.' });
  writeLeads(filtered);
  res.json({ success: true });
});

// GET /api/stats – statistik ringkas
app.get('/api/stats', authMiddleware, (req, res) => {
  const leads = readLeads();
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const yesterday = new Date(now.getTime() - (24 * 60 * 60 * 1000));
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  const stats = {
    total: leads.length,
    hari_ini: leads.filter(l => l.createdAt.startsWith(todayStr)).length,
    kemarin: leads.filter(l => l.createdAt.startsWith(yesterdayStr)).length,
    baru: leads.filter(l => l.status === 'baru').length,
    proses: leads.filter(l => l.status === 'proses').length,
    closing: leads.filter(l => l.status === 'closing').length,
    budget: {
      under25: leads.filter(l => l.budget === 'under25').length,
      '25to35': leads.filter(l => l.budget === '25to35').length,
      over35: leads.filter(l => l.budget === 'over35').length
    }
  };
  res.json(stats);
});

// POST /api/track – generic server-side pixel event
app.post('/api/track', async (req, res) => {
  const { event, userData, customData, pageUrl } = req.body;
  if (!event) return res.status(400).json({ error: 'event required' });

  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
  const ua = req.headers['user-agent'] || '';
  const ud = { ...(userData || {}), ip, userAgent: ua };

  const [metaResult, tikResult] = await Promise.allSettled([
    sendMetaCAPI(event, ud, customData || {}, pageUrl),
    sendTikTokEvent(event, ud, customData || {}),
  ]);

  res.json({
    success: true,
    meta: metaResult.status === 'fulfilled' ? metaResult.value : null,
    tiktok: tikResult.status === 'fulfilled' ? tikResult.value : null,
  });
});

// ─── Dashboard route ─────────────────────────────────────────
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard', 'index.html'));
});
app.get('/dashboard/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard', 'index.html'));
});

// ─── Start server ────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n✅ AKUH Server berjalan di http://localhost:${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard`);
  console.log(`📋 API Leads: http://localhost:${PORT}/api/leads\n`);
});
