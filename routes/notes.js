const express = require('express');
const router = express.Router();
const dataStore = require('../models/dataStore');

// GET /api/notes
router.get('/', async (req, res) => {
  try {
    const notes = await dataStore.getQuickNotes();
    res.json({ notes });
  } catch (err) {
    console.error('Error fetching notes:', err);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

// POST /api/notes
router.post('/', async (req, res) => {
  try {
    const content = req.body.notes || '';
    const saved = await dataStore.saveQuickNotes(content);
    res.json({ notes: saved, message: 'Notes saved successfully' });
  } catch (err) {
    console.error('Error saving notes:', err);
    res.status(500).json({ error: 'Failed to save notes' });
  }
});

module.exports = router;
