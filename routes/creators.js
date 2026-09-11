const express = require('express');
const router = express.Router();
const dataStore = require('../models/dataStore');

// GET /api/creators
router.get('/', async (req, res) => {
  try {
    const list = await dataStore.getAllCreators();
    res.json(list);
  } catch (err) {
    console.error('Error fetching creators:', err);
    res.status(500).json({ error: 'Failed to fetch competitors' });
  }
});

// GET /api/creators/:id
router.get('/:id', async (req, res) => {
  try {
    const creator = await dataStore.getCreatorById(req.params.id);
    if (!creator) return res.status(404).json({ error: 'Creator not found' });
    res.json(creator);
  } catch (err) {
    console.error('Error fetching creator:', err);
    res.status(500).json({ error: 'Failed to fetch creator' });
  }
});

// POST /api/creators
router.post('/', async (req, res) => {
  try {
    const { name, handle } = req.body;
    if (!name || !handle) {
      return res.status(400).json({ error: 'Name and handle are required' });
    }
    const created = await dataStore.createCreator(req.body);
    res.status(201).json(created);
  } catch (err) {
    console.error('Error creating creator:', err);
    res.status(500).json({ error: 'Failed to create creator' });
  }
});

// PUT /api/creators/:id
router.put('/:id', async (req, res) => {
  try {
    const updated = await dataStore.updateCreator(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Creator not found' });
    res.json(updated);
  } catch (err) {
    console.error('Error updating creator:', err);
    res.status(500).json({ error: 'Failed to update creator' });
  }
});

// DELETE /api/creators/:id
router.delete('/:id', async (req, res) => {
  try {
    const success = await dataStore.deleteCreator(req.params.id);
    if (!success) return res.status(404).json({ error: 'Creator not found' });
    res.json({ message: 'Creator removed successfully' });
  } catch (err) {
    console.error('Error deleting creator:', err);
    res.status(500).json({ error: 'Failed to delete creator' });
  }
});

// PATCH /api/creators/:id/pin
router.patch('/:id/pin', async (req, res) => {
  try {
    const pinned = await dataStore.togglePin(req.params.id);
    if (pinned === null) return res.status(404).json({ error: 'Creator not found' });
    res.json({ pinned });
  } catch (err) {
    console.error('Error toggling pin:', err);
    res.status(500).json({ error: 'Failed to toggle pin' });
  }
});

// PATCH /api/creators/:id/check
router.patch('/:id/check', async (req, res) => {
  try {
    const success = await dataStore.markChecked(req.params.id, req.body.checked);
    if (!success) return res.status(404).json({ error: 'Creator not found' });
    res.json({ success: true, checked: req.body.checked || new Date().toISOString().split('T')[0] });
  } catch (err) {
    console.error('Error marking checked:', err);
    res.status(500).json({ error: 'Failed to update checked status' });
  }
});

module.exports = router;
