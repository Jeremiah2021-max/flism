require("dotenv").config();
console.log(process.env.DATABASE_URL);
const express = require('express');
const cors = require('cors');
const path = require('path');
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

const app = express();
const PORT = process.env.PORT || 5000;
const IS_PROD = process.env.NODE_ENV === 'production';

app.use(cors({ origin: '*' }));
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
app.get('/api/health', (_req, res) =>
  res.json({ status: 'ok', app: 'Flism API', env: process.env.NODE_ENV || 'development' })
);

if (IS_PROD) {
  const distPath = path.join(__dirname, '../mobile/dist');
  app.use(express.static(distPath));
  app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
} else {
  const { createProxyMiddleware } = require('http-proxy-middleware');
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
        console.log(`Flism production server → http://0.0.0.0:${PORT}`);
      });
    } else {
      const { createProxyMiddleware } = require('http-proxy-middleware');
      const EXPO_PORT = 3000;
      const wsProxy = createProxyMiddleware({ target: `http://localhost:${EXPO_PORT}`, ws: true });
      const server = app.listen(PORT, '0.0.0.0', () => {
        console.log(`Flism dev server     → http://localhost:${PORT}`);
        console.log(`Expo proxy           → http://localhost:${EXPO_PORT}`);
      });
      server.on('upgrade', wsProxy.upgrade);
    }
  })
  .catch((err) => {
    console.error('DB init failed:', err.message);
    process.exit(1);
  });
