const express = require('express');
const router = express.Router();
const dataStore = require('../models/dataStore');

// GET /api/categories - list all categories with member creators
router.get('/', async (req, res) => {
  try {
    const categories = await dataStore.getAllCategories();
    const creators = await dataStore.getAllCreators();

    const result = categories.map(cat => {
      const members = creators.filter(c => (c.category || '').toLowerCase() === cat.name.toLowerCase());
      return {
        ...cat,
        creator_ids: members.map(c => c.id),
        creator_count: members.length
      };
    });

    res.json(result);
  } catch (err) {
    console.error('Error fetching categories:', err);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// POST /api/categories - create new category
router.post('/', async (req, res) => {
  try {
    const { name, description, color, icon } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Category name is required' });
    }
    const created = await dataStore.createCategory({ name, description, color, icon });
    res.status(201).json(created);
  } catch (err) {
    console.error('Error creating category:', err);
    res.status(500).json({ error: err.message || 'Failed to create category' });
  }
});

// PUT /api/categories/:name - update or rename category
router.put('/:name', async (req, res) => {
  try {
    const decodedName = decodeURIComponent(req.params.name);
    const updated = await dataStore.updateCategory(decodedName, req.body);
    if (!updated) return res.status(404).json({ error: 'Category not found' });
    res.json(updated);
  } catch (err) {
    console.error('Error updating category:', err);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// DELETE /api/categories/:name - delete category
router.delete('/:name', async (req, res) => {
  try {
    const decodedName = decodeURIComponent(req.params.name);
    const fallback = req.query.fallback || 'General Tech';
    const success = await dataStore.deleteCategory(decodedName, fallback);
    if (!success) return res.status(404).json({ error: 'Category not found' });
    res.json({ message: 'Category removed successfully', fallback });
  } catch (err) {
    console.error('Error deleting category:', err);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// POST /api/categories/:name/creators - assign creator to category
router.post('/:name/creators', async (req, res) => {
  try {
    const decodedName = decodeURIComponent(req.params.name);
    const { creatorId, creatorIds } = req.body;

    if (creatorIds && Array.isArray(creatorIds)) {
      for (const cid of creatorIds) {
        await dataStore.addCreatorToCategory(cid, decodedName);
      }
    } else if (creatorId !== undefined) {
      await dataStore.addCreatorToCategory(creatorId, decodedName);
    } else {
      return res.status(400).json({ error: 'creatorId or creatorIds array is required' });
    }

    res.json({ success: true, category: decodedName });
  } catch (err) {
    console.error('Error assigning creator to category:', err);
    res.status(500).json({ error: 'Failed to assign creator to category' });
  }
});

// DELETE /api/categories/:name/creators/:creatorId - remove creator from category
router.delete('/:name/creators/:creatorId', async (req, res) => {
  try {
    const success = await dataStore.removeCreatorFromCategory(req.params.creatorId);
    if (!success) return res.status(404).json({ error: 'Creator not found' });
    res.json({ success: true, message: 'Creator removed from category' });
  } catch (err) {
    console.error('Error removing creator from category:', err);
    res.status(500).json({ error: 'Failed to remove creator from category' });
  }
});

module.exports = router;
