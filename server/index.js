const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { initDb } = require('./db');
 
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const loanRoutes = require('./routes/loans');
const assetRoutes = require('./routes/assets');
const trustRoutes = require('./routes/trust');
const notificationRoutes = require('./routes/notifications');
const guarantorRoutes = require('./routes/guarantors');
const transactionRoutes = require('./routes/transactions');
const adminRoutes = require('./routes/admin');
const bankRoutes = require('./routes/bank');
 
const app = express();
const PORT = process.env.PORT || 5000;
const IS_PROD = process.env.NODE_ENV === 'production';
 
const ALLOWED_ORIGINS = IS_PROD
  ? [
      'https://flism-admin.onrender.com',
      'https://flism-server.onrender.com',
      'https://flism.onrender.com',
      'https://jeremiah2021-max.github.io',
    ]
  : [
      'http://localhost:3000',
      'http://localhost:5000',
      'http://localhost:8081',
    ];
 
// Single unified CORS handler — handles both preflight OPTIONS and real requests.
// Must be registered BEFORE all routes.
app.use((req, res, next) => {
  const origin = req.headers.origin;
 
  // Always set the origin header if it's allowed (or if there's no origin, e.g. mobile app / curl)
  if (!origin || ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  } else {
    // Unknown origin — still need to respond to OPTIONS or the browser gets a network error
    // Return 403 with a plain message (not a CORS rejection, which gives no body)
    if (req.method === 'OPTIONS') {
      return res.status(403).end();
    }
    return res.status(403).json({ error: 'Origin not allowed' });
  }
 
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400'); // cache preflight for 24 hours
 
  // Respond to preflight immediately — no need to hit route handlers
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
 
  next();
});
 
app.use(express.json({ limit: '10mb' }));
 
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/trust', trustRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/guarantors', guarantorRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/bank', bankRoutes);
 
app.get('/api/health', (_req, res) =>
  res.json({ status: 'ok', app: 'Flism API', env: process.env.NODE_ENV || 'development' })
);
 
if (IS_PROD) {
  // Serve admin panel at /admin
  const adminDist = path.join(__dirname, '../admin-app/dist');
  app.use('/admin', express.static(adminDist));
  app.get('/admin/*', (_req, res) => res.sendFile(path.join(adminDist, 'index.html')));
 
  // Serve student app at root
  const mobileDist = path.join(__dirname, '../mobile/dist');
  app.use(express.static(mobileDist));
  app.get('*', (_req, res) => res.sendFile(path.join(mobileDist, 'index.html')));
} else {
  const EXPO_PORT = 3000;
  const expoProxy = createProxyMiddleware({
    target: `http://localhost:${EXPO_PORT}`,
    changeOrigin: true,
    ws: true,
    on: {
      error: (_err, _req, res) => {
        if (res && typeof res.writeHead === 'function') {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`<html><head><title>Flism</title>
            <style>body{font-family:sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;background:#0052FF;color:#fff;}
            h1{font-size:2.5rem;margin-bottom:8px;}p{opacity:.75;}.dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#fff;margin:0 3px;animation:bounce .8s infinite alternate;}.dot:nth-child(2){animation-delay:.2s;}.dot:nth-child(3){animation-delay:.4s;}
            @keyframes bounce{to{transform:translateY(-8px);opacity:.3;}}</style>
            <script>setTimeout(()=>location.reload(),2500)</script></head>
            <body><h1>Flism</h1><p>Starting<span class=dot></span><span class=dot></span><span class=dot></span></p></body></html>`);
        }
      }
    }
  });
  app.use('/', expoProxy);
}
 
initDb()
  .then(() => {
    if (IS_PROD) {
      app.listen(PORT, '0.0.0.0', () => {
        console.log(`Flism production → http://0.0.0.0:${PORT}`);
        console.log(`Admin panel      → http://0.0.0.0:${PORT}/admin`);
      });
    } else {
      const EXPO_PORT = 3000;
      const wsProxy = createProxyMiddleware({ target: `http://localhost:${EXPO_PORT}`, ws: true });
      const server = app.listen(PORT, '0.0.0.0', () => {
        console.log(`Flism dev server → http://localhost:${PORT}`);
      });
      server.on('upgrade', wsProxy.upgrade);
    }
  })
  .catch((err) => {
    console.error('DB init failed:', err.message);
    process.exit(1);
  });