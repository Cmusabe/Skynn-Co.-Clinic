/**
 * Minimal static server for local development.
 * Production runs on Vercel (static hosting with vercel.json rewrites).
 * Serves files from current directory and rewrites /page to /page.html.
 */
const express = require('express');
const compression = require('compression');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const root = __dirname;

// Compression middleware (gzip/brotli for HTML, CSS, JS, JSON)
app.use(compression());

// Security headers middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// 1) Page routes first: /tarieven -> tarieven.html, /contact -> contact.html
app.get(/^\/([^./]+)\/?$/, (req, res, next) => {
  const base = req.params[0];
  if (base.includes('..')) return next();
  const htmlPath = path.resolve(root, base + '.html');
  if (fs.existsSync(htmlPath)) {
    // HTML pages: short cache (5 min) for content updates
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.sendFile(htmlPath);
  }
  next();
});
app.get('/', (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.sendFile(path.resolve(root, 'index.html'));
});

// 2) Static assets (css, js, images, etc.) with long cache
app.use(express.static(root, {
  index: false,
  maxAge: '7d',
  setHeaders: (res, filePath) => {
    // Set appropriate cache headers based on file type
    const ext = path.extname(filePath).toLowerCase();
    if (['.css', '.js', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.woff', '.woff2', '.ttf', '.mp4', '.webm'].includes(ext)) {
      res.setHeader('Cache-Control', 'public, max-age=604800'); // 7 days
    }
  }
}));

// Favicon route (optional, prevents 404s)
app.get('/favicon.ico', (req, res) => {
  const faviconPath = path.resolve(root, 'favicon.ico');
  if (fs.existsSync(faviconPath)) {
    res.setHeader('Cache-Control', 'public, max-age=604800');
    res.sendFile(faviconPath);
  } else {
    res.status(204).end();
  }
});

// 3) Fallback: SPA-style to index
app.get('*', (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.sendFile(path.resolve(root, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Skynn & Co. serving on port ${PORT}`);
});
