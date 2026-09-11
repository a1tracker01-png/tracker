const express = require('express');
const router = express.Router();
const dataStore = require('../models/dataStore');

// GET /api/reels
router.get('/', async (req, res) => {
  try {
    const list = await dataStore.getAllReels();
    res.json(list);
  } catch (err) {
    console.error('Error fetching reels:', err);
    res.status(500).json({ error: 'Failed to fetch reels' });
  }
});

// POST /api/reels
router.post('/', async (req, res) => {
  try {
    const { cid, topic } = req.body;
    if (!cid || !topic) {
      return res.status(400).json({ error: 'Competitor ID (cid) and topic are required' });
    }
    const created = await dataStore.createReel(req.body);
    res.status(201).json(created);
  } catch (err) {
    console.error('Error creating reel:', err);
    res.status(500).json({ error: 'Failed to create reel' });
  }
});

// PUT /api/reels/:id
router.put('/:id', async (req, res) => {
  try {
    const updated = await dataStore.updateReel(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Reel not found' });
    res.json(updated);
  } catch (err) {
    console.error('Error updating reel:', err);
    res.status(500).json({ error: 'Failed to update reel' });
  }
});

// DELETE /api/reels/:id
router.delete('/:id', async (req, res) => {
  try {
    const success = await dataStore.deleteReel(req.params.id);
    if (!success) return res.status(404).json({ error: 'Reel not found' });
    res.json({ message: 'Reel deleted successfully' });
  } catch (err) {
    console.error('Error deleting reel:', err);
    res.status(500).json({ error: 'Failed to delete reel' });
  }
});

module.exports = router;
