require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDB, isDbConnected } = require('./config/db');
const { isCloudinaryConfigured } = require('./config/cloudinary');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static frontend assets from public/
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/creators', require('./routes/creators'));
app.use('/api/reels', require('./routes/reels'));
app.use('/api/inspirations', require('./routes/inspirations'));
app.use('/api/alerts', require('./routes/alerts'));
app.use('/api/notes', require('./routes/notes'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/seed', require('./routes/seed'));

// Fallback to index.html for SPA/Static serving
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Central Error Handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

// Start Server & Initialize Database
async function startServer() {
  console.log('🚀 Initializing Qurion Competitor Tracker Server...');

  // Try to connect to PostgreSQL Neon DB
  try {
    await initDB();
  } catch (err) {
    console.warn('⚠️  Database initialization warning:', err.message);
  }

  app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🌐 Server running at: http://localhost:${PORT}`);
    console.log(`📊 PostgreSQL Neon DB: ${isDbConnected() ? 'CONNECTED ✅' : 'NOT CONNECTED (Using loaded fallback) ⚠️'}`);
    console.log(`☁️  Cloudinary:        ${isCloudinaryConfigured() ? 'CONFIGURED ✅' : 'PENDING CREDENTIALS (Using fallback) ⚠️'}`);
    console.log(`💡 Seed DB anytime via: npm run seed`);
    console.log(`======================================================\n`);
  });
}

startServer();
