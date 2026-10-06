const express = require('express');
const router = express.Router();
const dataStore = require('../models/dataStore');

// GET /api/playlists - list all playlists
router.get('/', async (req, res) => {
  try {
    const list = await dataStore.getAllPlaylists();
    res.json(list);
  } catch (err) {
    console.error('Error fetching playlists:', err);
    res.status(500).json({ error: 'Failed to fetch playlists' });
  }
});

// GET /api/playlists/:id - get single playlist
router.get('/:id', async (req, res) => {
  try {
    const playlist = await dataStore.getPlaylistById(req.params.id);
    if (!playlist) return res.status(404).json({ error: 'Playlist not found' });
    res.json(playlist);
  } catch (err) {
    console.error('Error fetching playlist:', err);
    res.status(500).json({ error: 'Failed to fetch playlist' });
  }
});

// POST /api/playlists - create new playlist
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Playlist name is required' });
    }
    const created = await dataStore.createPlaylist(req.body);
    res.status(201).json(created);
  } catch (err) {
    console.error('Error creating playlist:', err);
    res.status(500).json({ error: err.message || 'Failed to create playlist' });
  }
});

// PUT /api/playlists/:id - update playlist info or creators
router.put('/:id', async (req, res) => {
  try {
    const updated = await dataStore.updatePlaylist(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Playlist not found' });
    res.json(updated);
  } catch (err) {
    console.error('Error updating playlist:', err);
    res.status(500).json({ error: 'Failed to update playlist' });
  }
});

// DELETE /api/playlists/:id - delete playlist
router.delete('/:id', async (req, res) => {
  try {
    const success = await dataStore.deletePlaylist(req.params.id);
    if (!success) return res.status(404).json({ error: 'Playlist not found' });
    res.json({ message: 'Playlist removed successfully' });
  } catch (err) {
    console.error('Error deleting playlist:', err);
    res.status(500).json({ error: 'Failed to delete playlist' });
  }
});

// POST /api/playlists/:id/creators - add creator(s) to playlist
router.post('/:id/creators', async (req, res) => {
  try {
    const { creatorId, creatorIds } = req.body;
    let playlist = null;

    if (creatorIds && Array.isArray(creatorIds)) {
      for (const cid of creatorIds) {
        playlist = await dataStore.addCreatorToPlaylist(req.params.id, cid);
      }
    } else if (creatorId !== undefined) {
      playlist = await dataStore.addCreatorToPlaylist(req.params.id, creatorId);
    } else {
      return res.status(400).json({ error: 'creatorId or creatorIds array is required' });
    }

    if (!playlist) return res.status(404).json({ error: 'Playlist not found' });
    res.json(playlist);
  } catch (err) {
    console.error('Error adding creator to playlist:', err);
    res.status(500).json({ error: 'Failed to add creator to playlist' });
  }
});

// DELETE /api/playlists/:id/creators/:creatorId - remove creator from playlist
router.delete('/:id/creators/:creatorId', async (req, res) => {
  try {
    const playlist = await dataStore.removeCreatorFromPlaylist(req.params.id, req.params.creatorId);
    if (!playlist) return res.status(404).json({ error: 'Playlist not found' });
    res.json(playlist);
  } catch (err) {
    console.error('Error removing creator from playlist:', err);
    res.status(500).json({ error: 'Failed to remove creator from playlist' });
  }
});

// POST /api/playlists/creator/:creatorId - set all playlists for a specific creator
router.post('/creator/:creatorId', async (req, res) => {
  try {
    const { playlistIds } = req.body;
    if (!Array.isArray(playlistIds)) {
      return res.status(400).json({ error: 'playlistIds array is required' });
    }
    const updatedPlaylists = await dataStore.setCreatorPlaylists(req.params.creatorId, playlistIds);
    res.json({ success: true, playlists: updatedPlaylists });
  } catch (err) {
    console.error('Error updating creator playlists:', err);
    res.status(500).json({ error: 'Failed to update creator playlists' });
  }
});

module.exports = router;
