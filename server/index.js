const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { initDb } = require('./db');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const loanRoutes = require('./routes/loans');
const assetRoutes = require('./routes/assets');
const trustRoutes = require('./routes/trust');
const notificationRoutes = require('./routes/notifications');

const app = express();
const PORT = 5000;
const EXPO_PORT = 3000;

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/trust', trustRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok', app: 'Flism API' }));

// Proxy everything else to the Expo web dev server
const expoProxy = createProxyMiddleware({
  target: `http://localhost:${EXPO_PORT}`,
  changeOrigin: true,
  ws: true,
  on: {
    error: (err, req, res) => {
      if (res && typeof res.writeHead === 'function') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <html><head><title>Flism Loading</title>
          <style>body{font-family:sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;background:#0052FF;color:#fff;}
          h1{font-size:2.5rem;margin-bottom:8px;} p{opacity:.75;} .dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#fff;margin:0 3px;animation:bounce .8s infinite alternate;} .dot:nth-child(2){animation-delay:.2s;} .dot:nth-child(3){animation-delay:.4s;}
          @keyframes bounce{to{transform:translateY(-8px);opacity:.3;}}</style>
          <script>setTimeout(()=>location.reload(),2500)</script>
          </head><body>
          <h1>Flism</h1>
          <p>Starting app<span class=dot></span><span class=dot></span><span class=dot></span></p>
          </body></html>
        `);
      }
    }
  }
});
app.use('/', expoProxy);

initDb()
  .then(() => {
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`Flism server running on port ${PORT}`);
      console.log(`API: http://localhost:${PORT}/api`);
      console.log(`App: http://localhost:${PORT} (proxied from Expo on :${EXPO_PORT})`);
    });
    server.on('upgrade', expoProxy.upgrade);
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err.message);
    process.exit(1);
  });
