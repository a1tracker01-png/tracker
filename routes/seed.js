const express = require('express');
const router = express.Router();
const dataStore = require('../models/dataStore');
const preloadedData = require('../data/preloaded.json');

// POST /api/seed - seeds or resets the database with the preloaded 48 competitors
router.post('/', async (req, res) => {
  try {
    const payload = req.body && Object.keys(req.body).length > 0 ? req.body : preloadedData;
    const result = await dataStore.seedDatabase(payload);
    res.json({
      message: 'Database seeded successfully!',
      result
    });
  } catch (err) {
    console.error('Error seeding database:', err);
    res.status(500).json({ error: 'Failed to seed database: ' + err.message });
  }
});

// GET /api/health - check status of DB and Cloudinary connections
router.get('/status', async (req, res) => {
  const { isDbConnected } = require('../config/db');
  const { isCloudinaryConfigured } = require('../config/cloudinary');

  res.json({
    databaseConnected: isDbConnected(),
    cloudinaryConfigured: isCloudinaryConfigured(),
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
