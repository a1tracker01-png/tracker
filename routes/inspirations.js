const express = require('express');
const router = express.Router();
const dataStore = require('../models/dataStore');

// GET /api/inspirations
router.get('/', async (req, res) => {
  try {
    const list = await dataStore.getAllInspirations();
    res.json(list);
  } catch (err) {
    console.error('Error fetching inspirations:', err);
    res.status(500).json({ error: 'Failed to fetch inspirations' });
  }
});

// POST /api/inspirations
router.post('/', async (req, res) => {
  try {
    const { note } = req.body;
    if (!note) {
      return res.status(400).json({ error: 'Note is required' });
    }
    const created = await dataStore.createInspiration(req.body);
    res.status(201).json(created);
  } catch (err) {
    console.error('Error creating inspiration:', err);
    res.status(500).json({ error: 'Failed to create inspiration' });
  }
});

// DELETE /api/inspirations/:id
router.delete('/:id', async (req, res) => {
  try {
    const success = await dataStore.deleteInspiration(req.params.id);
    if (!success) return res.status(404).json({ error: 'Inspiration not found' });
    res.json({ message: 'Inspiration removed' });
  } catch (err) {
    console.error('Error deleting inspiration:', err);
    res.status(500).json({ error: 'Failed to delete inspiration' });
  }
});

module.exports = router;
