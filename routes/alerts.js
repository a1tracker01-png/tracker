const express = require('express');
const router = express.Router();
const dataStore = require('../models/dataStore');

// GET /api/alerts
router.get('/', async (req, res) => {
  try {
    const list = await dataStore.getAllAlerts();
    res.json(list);
  } catch (err) {
    console.error('Error fetching viral alerts:', err);
    res.status(500).json({ error: 'Failed to fetch viral alerts' });
  }
});

// POST /api/alerts
router.post('/', async (req, res) => {
  try {
    const { creator, note } = req.body;
    if (!creator || !note) {
      return res.status(400).json({ error: 'Creator name and note are required' });
    }
    const created = await dataStore.createAlert(req.body);
    res.status(201).json(created);
  } catch (err) {
    console.error('Error creating viral alert:', err);
    res.status(500).json({ error: 'Failed to create viral alert' });
  }
});

// DELETE /api/alerts/:id
router.delete('/:id', async (req, res) => {
  try {
    const success = await dataStore.deleteAlert(req.params.id);
    if (!success) return res.status(404).json({ error: 'Alert not found' });
    res.json({ message: 'Alert removed' });
  } catch (err) {
    console.error('Error deleting viral alert:', err);
    res.status(500).json({ error: 'Failed to delete viral alert' });
  }
});

module.exports = router;
