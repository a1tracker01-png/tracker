const { query, isDbConnected } = require('../config/db');
const preloadedData = require('../data/preloaded.json');

// In-memory fallback state in case database is not connected yet
let memoryStore = {
  creators: JSON.parse(JSON.stringify(preloadedData.creators || [])),
  reels: JSON.parse(JSON.stringify(preloadedData.reels || [])),
  inspirations: JSON.parse(JSON.stringify(preloadedData.inspirations || [])),
  viralAlerts: JSON.parse(JSON.stringify(preloadedData.viralAlerts || [])),
  playlists: JSON.parse(JSON.stringify(preloadedData.playlists || [])),
  categories: JSON.parse(JSON.stringify(preloadedData.categories || [])),
  qNotes: preloadedData.qNotes || ''
};

// ==========================================
// HELPERS
// ==========================================
function parseFollowers(v) {
  if (v === null || v === undefined || v === '') return 0;
  if (typeof v === 'number') return isNaN(v) ? 0 : Math.round(v);
  const s = v.toString().toLowerCase().trim();
  if (s.endsWith('m')) {
    const n = parseFloat(s);
    return isNaN(n) ? 0 : Math.round(n * 1e6);
  }
  if (s.endsWith('k')) {
    const n = parseFloat(s);
    return isNaN(n) ? 0 : Math.round(n * 1e3);
  }
  const clean = s.replace(/[^0-9]/g, '');
  const parsed = parseInt(clean, 10);
  return isNaN(parsed) ? 0 : parsed;
}

function sanitizeDate(d) {
  if (!d || typeof d !== 'string' || !d.trim()) return null;
  const s = d.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const parsed = new Date(s);
  if (isNaN(parsed.getTime())) return null;
  return parsed.toISOString().split('T')[0];
}

function sanitizeTags(tags) {
  if (Array.isArray(tags)) return tags;
  if (typeof tags === 'string') {
    try {
      const parsed = JSON.parse(tags);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {}
  }
  return [];
}

function sanitizeCreatorIds(ids) {
  if (Array.isArray(ids)) {
    return Array.from(new Set(ids.map(Number).filter(n => !isNaN(n) && n > 0)));
  }
  if (typeof ids === 'string') {
    try {
      const parsed = JSON.parse(ids);
      if (Array.isArray(parsed)) {
        return Array.from(new Set(parsed.map(Number).filter(n => !isNaN(n) && n > 0)));
      }
    } catch (e) {}
  }
  return [];
}

// ==========================================
// CREATORS
// ==========================================
async function getAllCreators() {
  if (isDbConnected()) {
    const res = await query('SELECT * FROM creators ORDER BY pinned DESC, followers DESC, id ASC');
    return res.rows.map(row => ({
      id: Number(row.id),
      name: row.name,
      handle: row.handle,
      followers: Number(row.followers || 0),
      growth: row.growth || '',
      eng: row.eng || '',
      avgV: row.avg_v || '',
      category: row.category || '',
      badge: row.badge || 'none',
      tags: Array.isArray(row.tags) ? row.tags : (typeof row.tags === 'string' ? JSON.parse(row.tags) : []),
      freq: row.freq || '',
      notes: row.notes || '',
      checked: row.checked ? new Date(row.checked).toISOString().split('T')[0] : null,
      avatar: row.avatar || null,
      pinned: Boolean(row.pinned)
    }));
  }
  return memoryStore.creators;
}

async function getCreatorById(id) {
  const numId = Number(id);
  if (isDbConnected()) {
    const res = await query('SELECT * FROM creators WHERE id = $1', [numId]);
    if (!res.rows.length) return null;
    const row = res.rows[0];
    return {
      id: Number(row.id),
      name: row.name,
      handle: row.handle,
      followers: Number(row.followers || 0),
      growth: row.growth || '',
      eng: row.eng || '',
      avgV: row.avg_v || '',
      category: row.category || '',
      badge: row.badge || 'none',
      tags: Array.isArray(row.tags) ? row.tags : (typeof row.tags === 'string' ? JSON.parse(row.tags) : []),
      freq: row.freq || '',
      notes: row.notes || '',
      checked: row.checked ? new Date(row.checked).toISOString().split('T')[0] : null,
      avatar: row.avatar || null,
      pinned: Boolean(row.pinned)
    };
  }
  return memoryStore.creators.find(c => c.id === numId) || null;
}

async function createCreator(data) {
  const id = data.id ? Number(data.id) : Date.now();
  const followers = parseFollowers(data.followers);
  const checkedDate = sanitizeDate(data.checked);
  const tags = sanitizeTags(data.tags);

  if (isDbConnected()) {
    const tagsJson = JSON.stringify(tags);
    const text = `
      INSERT INTO creators (id, name, handle, followers, growth, eng, avg_v, category, badge, tags, freq, notes, checked, avatar, pinned)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $12, $13, $14, $15)
      RETURNING *;
    `;
    const values = [
      id,
      data.name,
      data.handle,
      followers,
      data.growth || '',
      data.eng || '',
      data.avgV || '',
      data.category || 'Tech Hacks',
      data.badge || 'none',
      tagsJson,
      data.freq || '',
      data.notes || '',
      checkedDate,
      data.avatar || null,
      Boolean(data.pinned)
    ];
    const res = await query(text, values);
    const row = res.rows[0];
    return {
      id: Number(row.id),
      name: row.name,
      handle: row.handle,
      followers: Number(row.followers || 0),
      growth: row.growth || '',
      eng: row.eng || '',
      avgV: row.avg_v || '',
      category: row.category || '',
      badge: row.badge || 'none',
      tags: Array.isArray(row.tags) ? row.tags : (typeof row.tags === 'string' ? JSON.parse(row.tags || '[]') : []),
      freq: row.freq || '',
      notes: row.notes || '',
      checked: row.checked ? new Date(row.checked).toISOString().split('T')[0] : null,
      avatar: row.avatar || null,
      pinned: Boolean(row.pinned)
    };
  }

  const newCreator = {
    id,
    name: data.name,
    handle: data.handle,
    followers,
    growth: data.growth || '',
    eng: data.eng || '',
    avgV: data.avgV || '',
    category: data.category || 'Tech Hacks',
    badge: data.badge || 'none',
    tags,
    freq: data.freq || '',
    notes: data.notes || '',
    checked: checkedDate,
    avatar: data.avatar || null,
    pinned: Boolean(data.pinned)
  };
  memoryStore.creators.push(newCreator);
  return newCreator;
}

async function updateCreator(id, data) {
  const numId = Number(id);
  const followers = parseFollowers(data.followers);
  const checkedDate = sanitizeDate(data.checked);
  const tags = sanitizeTags(data.tags);

  if (isDbConnected()) {
    const tagsJson = JSON.stringify(tags);
    const text = `
      UPDATE creators
      SET name = $1, handle = $2, followers = $3, growth = $4, eng = $5,
          avg_v = $6, category = $7, badge = $8, tags = $9::jsonb,
          freq = $10, notes = $11, checked = $12, avatar = COALESCE($13, avatar), pinned = $14
      WHERE id = $15
      RETURNING *;
    `;
    const values = [
      data.name,
      data.handle,
      followers,
      data.growth || '',
      data.eng || '',
      data.avgV || '',
      data.category || 'Tech Hacks',
      data.badge || 'none',
      tagsJson,
      data.freq || '',
      data.notes || '',
      checkedDate,
      data.avatar !== undefined ? data.avatar : null,
      Boolean(data.pinned),
      numId
    ];
    const res = await query(text, values);
    if (!res.rows.length) return null;
    const row = res.rows[0];
    return {
      id: Number(row.id),
      name: row.name,
      handle: row.handle,
      followers: Number(row.followers || 0),
      growth: row.growth || '',
      eng: row.eng || '',
      avgV: row.avg_v || '',
      category: row.category || '',
      badge: row.badge || 'none',
      tags: Array.isArray(row.tags) ? row.tags : (typeof row.tags === 'string' ? JSON.parse(row.tags || '[]') : []),
      freq: row.freq || '',
      notes: row.notes || '',
      checked: row.checked ? new Date(row.checked).toISOString().split('T')[0] : null,
      avatar: row.avatar || null,
      pinned: Boolean(row.pinned)
    };
  }

  const idx = memoryStore.creators.findIndex(c => c.id === numId);
  if (idx === -1) return null;
  memoryStore.creators[idx] = {
    ...memoryStore.creators[idx],
    ...data,
    followers,
    tags,
    checked: checkedDate,
    avatar: data.avatar !== undefined ? data.avatar : memoryStore.creators[idx].avatar
  };
  return memoryStore.creators[idx];
}

async function deleteCreator(id) {
  const numId = Number(id);
  if (isDbConnected()) {
    await query('DELETE FROM reels WHERE cid = $1', [numId]);
    const res = await query('DELETE FROM creators WHERE id = $1 RETURNING id', [numId]);
    try {
      const plRes = await query('SELECT id, creator_ids FROM playlists');
      for (const row of plRes.rows) {
        const ids = sanitizeCreatorIds(row.creator_ids);
        if (ids.includes(numId)) {
          const filtered = ids.filter(x => x !== numId);
          await query('UPDATE playlists SET creator_ids = $1::jsonb WHERE id = $2', [JSON.stringify(filtered), row.id]);
        }
      }
    } catch (e) {}
    return res.rowCount > 0;
  }
  const prevLen = memoryStore.creators.length;
  memoryStore.creators = memoryStore.creators.filter(c => c.id !== numId);
  memoryStore.reels = memoryStore.reels.filter(r => r.cid !== numId);
  if (memoryStore.playlists) {
    memoryStore.playlists.forEach(pl => {
      pl.creator_ids = (pl.creator_ids || []).filter(x => x !== numId);
    });
  }
  return memoryStore.creators.length < prevLen;
}

async function togglePin(id) {
  const numId = Number(id);
  if (isDbConnected()) {
    const res = await query('UPDATE creators SET pinned = NOT pinned WHERE id = $1 RETURNING *', [numId]);
    if (!res.rows.length) return null;
    return Boolean(res.rows[0].pinned);
  }
  const creator = memoryStore.creators.find(c => c.id === numId);
  if (!creator) return null;
  creator.pinned = !creator.pinned;
  return creator.pinned;
}

async function markChecked(id, dateStr) {
  const numId = Number(id);
  const dateVal = dateStr || new Date().toISOString().split('T')[0];
  if (isDbConnected()) {
    const res = await query('UPDATE creators SET checked = $1 WHERE id = $2 RETURNING *', [dateVal, numId]);
    return res.rows.length > 0;
  }
  const creator = memoryStore.creators.find(c => c.id === numId);
  if (!creator) return false;
  creator.checked = dateVal;
  return true;
}

// ==========================================
// REELS
// ==========================================
async function getAllReels() {
  if (isDbConnected()) {
    const res = await query('SELECT * FROM reels ORDER BY date DESC, id DESC');
    return res.rows.map(row => ({
      id: Number(row.id),
      cid: Number(row.cid),
      topic: row.topic,
      date: row.date ? new Date(row.date).toISOString().split('T')[0] : null,
      views: row.views || '',
      format: row.format || 'Reel',
      hook: row.hook || '',
      viral: Boolean(row.viral),
      notes: row.notes || ''
    }));
  }
  return memoryStore.reels;
}

async function createReel(data) {
  const id = data.id || Date.now();
  const cid = Number(data.cid);
  if (isDbConnected()) {
    const text = `
      INSERT INTO reels (id, cid, topic, date, views, format, hook, viral, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;
    `;
    const values = [
      id,
      cid,
      data.topic,
      data.date || null,
      data.views || '',
      data.format || 'Reel',
      data.hook || '',
      Boolean(data.viral),
      data.notes || ''
    ];
    const res = await query(text, values);
    const row = res.rows[0];
    return {
      id: Number(row.id),
      cid: Number(row.cid),
      topic: row.topic,
      date: row.date ? new Date(row.date).toISOString().split('T')[0] : null,
      views: row.views || '',
      format: row.format || 'Reel',
      hook: row.hook || '',
      viral: Boolean(row.viral),
      notes: row.notes || ''
    };
  }

  const newReel = {
    id,
    cid,
    topic: data.topic,
    date: data.date || '',
    views: data.views || '',
    format: data.format || 'Reel',
    hook: data.hook || '',
    viral: Boolean(data.viral),
    notes: data.notes || ''
  };
  memoryStore.reels.push(newReel);
  return newReel;
}

async function updateReel(id, data) {
  const numId = Number(id);
  if (isDbConnected()) {
    const text = `
      UPDATE reels
      SET topic = $1, date = $2, views = $3, format = $4, hook = $5, viral = $6, notes = $7
      WHERE id = $8
      RETURNING *;
    `;
    const values = [
      data.topic,
      data.date || null,
      data.views || '',
      data.format || 'Reel',
      data.hook || '',
      Boolean(data.viral),
      data.notes || '',
      numId
    ];
    const res = await query(text, values);
    if (!res.rows.length) return null;
    const row = res.rows[0];
    return {
      id: Number(row.id),
      cid: Number(row.cid),
      topic: row.topic,
      date: row.date ? new Date(row.date).toISOString().split('T')[0] : null,
      views: row.views || '',
      format: row.format || 'Reel',
      hook: row.hook || '',
      viral: Boolean(row.viral),
      notes: row.notes || ''
    };
  }

  const idx = memoryStore.reels.findIndex(r => r.id === numId);
  if (idx === -1) return null;
  memoryStore.reels[idx] = { ...memoryStore.reels[idx], ...data };
  return memoryStore.reels[idx];
}

async function deleteReel(id) {
  const numId = Number(id);
  if (isDbConnected()) {
    const res = await query('DELETE FROM reels WHERE id = $1 RETURNING id', [numId]);
    return res.rowCount > 0;
  }
  const prevLen = memoryStore.reels.length;
  memoryStore.reels = memoryStore.reels.filter(r => r.id !== numId);
  return memoryStore.reels.length < prevLen;
}

// ==========================================
// INSPIRATIONS
// ==========================================
async function getAllInspirations() {
  if (isDbConnected()) {
    const res = await query('SELECT * FROM inspirations ORDER BY id DESC');
    return res.rows.map(row => ({
      id: Number(row.id),
      creator: row.creator || '',
      type: row.type || 'Hook',
      note: row.note,
      tags: Array.isArray(row.tags) ? row.tags : (typeof row.tags === 'string' ? JSON.parse(row.tags) : []),
      date: row.date ? new Date(row.date).toISOString().split('T')[0] : null
    }));
  }
  return memoryStore.inspirations;
}

async function createInspiration(data) {
  const id = data.id || Date.now();
  if (isDbConnected()) {
    const tagsJson = JSON.stringify(data.tags || []);
    const text = `
      INSERT INTO inspirations (id, creator, type, note, tags, date)
      VALUES ($1, $2, $3, $4, $5::jsonb, $6)
      RETURNING *;
    `;
    const values = [
      id,
      data.creator || '',
      data.type || 'Hook',
      data.note,
      tagsJson,
      data.date || new Date().toISOString().split('T')[0]
    ];
    const res = await query(text, values);
    const row = res.rows[0];
    return {
      id: Number(row.id),
      creator: row.creator || '',
      type: row.type || 'Hook',
      note: row.note,
      tags: Array.isArray(row.tags) ? row.tags : JSON.parse(row.tags || '[]'),
      date: row.date ? new Date(row.date).toISOString().split('T')[0] : null
    };
  }

  const newIns = {
    id,
    creator: data.creator || '',
    type: data.type || 'Hook',
    note: data.note,
    tags: data.tags || [],
    date: data.date || new Date().toISOString().split('T')[0]
  };
  memoryStore.inspirations.unshift(newIns);
  return newIns;
}

async function deleteInspiration(id) {
  const numId = Number(id);
  if (isDbConnected()) {
    const res = await query('DELETE FROM inspirations WHERE id = $1 RETURNING id', [numId]);
    return res.rowCount > 0;
  }
  const prevLen = memoryStore.inspirations.length;
  memoryStore.inspirations = memoryStore.inspirations.filter(i => i.id !== numId);
  return memoryStore.inspirations.length < prevLen;
}

// ==========================================
// VIRAL ALERTS
// ==========================================
async function getAllAlerts() {
  if (isDbConnected()) {
    const res = await query('SELECT * FROM viral_alerts ORDER BY id DESC');
    return res.rows.map(row => ({
      id: Number(row.id),
      creator: row.creator,
      note: row.note,
      date: row.date ? new Date(row.date).toISOString().split('T')[0] : null
    }));
  }
  return memoryStore.viralAlerts;
}

async function createAlert(data) {
  const id = data.id || Date.now();
  if (isDbConnected()) {
    const text = `
      INSERT INTO viral_alerts (id, creator, note, date)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const values = [
      id,
      data.creator,
      data.note,
      data.date || new Date().toISOString().split('T')[0]
    ];
    const res = await query(text, values);
    const row = res.rows[0];
    return {
      id: Number(row.id),
      creator: row.creator,
      note: row.note,
      date: row.date ? new Date(row.date).toISOString().split('T')[0] : null
    };
  }

  const newAlert = {
    id,
    creator: data.creator,
    note: data.note,
    date: data.date || new Date().toISOString().split('T')[0]
  };
  memoryStore.viralAlerts.unshift(newAlert);
  return newAlert;
}

async function deleteAlert(id) {
  const numId = Number(id);
  if (isDbConnected()) {
    const res = await query('DELETE FROM viral_alerts WHERE id = $1 RETURNING id', [numId]);
    return res.rowCount > 0;
  }
  const prevLen = memoryStore.viralAlerts.length;
  memoryStore.viralAlerts = memoryStore.viralAlerts.filter(a => a.id !== numId);
  return memoryStore.viralAlerts.length < prevLen;
}

// ==========================================
// QUICK NOTES
// ==========================================
async function getQuickNotes() {
  if (isDbConnected()) {
    const res = await query('SELECT content FROM quick_notes WHERE id = 1');
    if (res.rows.length) {
      return res.rows[0].content || '';
    }
    return '';
  }
  return memoryStore.qNotes;
}

async function saveQuickNotes(content) {
  if (isDbConnected()) {
    const text = `
      INSERT INTO quick_notes (id, content, updated_at)
      VALUES (1, $1, NOW())
      ON CONFLICT (id) DO UPDATE SET content = EXCLUDED.content, updated_at = NOW();
    `;
    await query(text, [content]);
    return content;
  }
  memoryStore.qNotes = content;
  return content;
}

// ==========================================
// PLAYLISTS / CUSTOM CATEGORIES
// ==========================================
async function ensureDefaultPlaylists() {
  if (isDbConnected()) {
    try {
      const chk = await query('SELECT COUNT(*) FROM playlists');
      if (chk.rows && Number(chk.rows[0].count) === 0) {
        for (const pl of preloadedData.playlists || []) {
          await query(
            `INSERT INTO playlists (id, name, description, color, icon, creator_ids)
             VALUES ($1, $2, $3, $4, $5, $6::jsonb)
             ON CONFLICT (id) DO NOTHING`,
            [pl.id, pl.name, pl.description || '', pl.color || '#7B2FBE', pl.icon || 'ti-playlist', JSON.stringify(pl.creator_ids || [])]
          );
        }
      }
    } catch (e) {
      console.warn('Playlist ensure error:', e.message);
    }
  }
}

async function getAllPlaylists() {
  if (isDbConnected()) {
    await ensureDefaultPlaylists();
    const res = await query('SELECT * FROM playlists ORDER BY created_at ASC, id ASC');
    return res.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description || '',
      color: row.color || '#7B2FBE',
      icon: row.icon || 'ti-playlist',
      creator_ids: sanitizeCreatorIds(row.creator_ids),
      created_at: row.created_at
    }));
  }
  return memoryStore.playlists;
}

async function getPlaylistById(id) {
  if (isDbConnected()) {
    const res = await query('SELECT * FROM playlists WHERE id = $1', [id]);
    if (!res.rows.length) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      name: row.name,
      description: row.description || '',
      color: row.color || '#7B2FBE',
      icon: row.icon || 'ti-playlist',
      creator_ids: sanitizeCreatorIds(row.creator_ids),
      created_at: row.created_at
    };
  }
  return memoryStore.playlists.find(p => p.id === id) || null;
}

async function createPlaylist(data) {
  const id = data.id || `pl_${Date.now()}`;
  const name = (data.name || '').trim();
  const description = (data.description || '').trim();
  const color = data.color || '#7B2FBE';
  const icon = data.icon || 'ti-playlist';
  const creator_ids = sanitizeCreatorIds(data.creator_ids);

  if (isDbConnected()) {
    const res = await query(
      `INSERT INTO playlists (id, name, description, color, icon, creator_ids)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)
       RETURNING *`,
      [id, name, description, color, icon, JSON.stringify(creator_ids)]
    );
    const row = res.rows[0];
    return {
      id: row.id,
      name: row.name,
      description: row.description || '',
      color: row.color || '#7B2FBE',
      icon: row.icon || 'ti-playlist',
      creator_ids: sanitizeCreatorIds(row.creator_ids),
      created_at: row.created_at
    };
  }

  const newPl = { id, name, description, color, icon, creator_ids, created_at: new Date().toISOString() };
  memoryStore.playlists.push(newPl);
  return newPl;
}

async function updatePlaylist(id, data) {
  const existing = await getPlaylistById(id);
  if (!existing) return null;

  const name = data.name !== undefined ? data.name.trim() : existing.name;
  const description = data.description !== undefined ? data.description.trim() : existing.description;
  const color = data.color || existing.color;
  const icon = data.icon || existing.icon;
  const creator_ids = data.creator_ids !== undefined ? sanitizeCreatorIds(data.creator_ids) : existing.creator_ids;

  if (isDbConnected()) {
    const res = await query(
      `UPDATE playlists
       SET name = $1, description = $2, color = $3, icon = $4, creator_ids = $5::jsonb
       WHERE id = $6
       RETURNING *`,
      [name, description, color, icon, JSON.stringify(creator_ids), id]
    );
    if (!res.rows.length) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      name: row.name,
      description: row.description || '',
      color: row.color || '#7B2FBE',
      icon: row.icon || 'ti-playlist',
      creator_ids: sanitizeCreatorIds(row.creator_ids),
      created_at: row.created_at
    };
  }

  const idx = memoryStore.playlists.findIndex(p => p.id === id);
  if (idx === -1) return null;
  memoryStore.playlists[idx] = { ...memoryStore.playlists[idx], name, description, color, icon, creator_ids };
  return memoryStore.playlists[idx];
}

async function deletePlaylist(id) {
  if (isDbConnected()) {
    const res = await query('DELETE FROM playlists WHERE id = $1 RETURNING id', [id]);
    return res.rowCount > 0;
  }
  const prevLen = memoryStore.playlists.length;
  memoryStore.playlists = memoryStore.playlists.filter(p => p.id !== id);
  return memoryStore.playlists.length < prevLen;
}

async function addCreatorToPlaylist(playlistId, creatorId) {
  const numId = Number(creatorId);
  const pl = await getPlaylistById(playlistId);
  if (!pl) return null;
  if (!pl.creator_ids.includes(numId)) {
    const updatedIds = [...pl.creator_ids, numId];
    return await updatePlaylist(playlistId, { creator_ids: updatedIds });
  }
  return pl;
}

async function removeCreatorFromPlaylist(playlistId, creatorId) {
  const numId = Number(creatorId);
  const pl = await getPlaylistById(playlistId);
  if (!pl) return null;
  const updatedIds = pl.creator_ids.filter(id => id !== numId);
  return await updatePlaylist(playlistId, { creator_ids: updatedIds });
}

async function setCreatorPlaylists(creatorId, targetPlaylistIds) {
  const numId = Number(creatorId);
  const allPlaylists = await getAllPlaylists();
  const targetSet = new Set(targetPlaylistIds || []);

  for (const pl of allPlaylists) {
    const hasCreator = pl.creator_ids.includes(numId);
    const shouldHave = targetSet.has(pl.id);
    if (shouldHave && !hasCreator) {
      await addCreatorToPlaylist(pl.id, numId);
    } else if (!shouldHave && hasCreator) {
      await removeCreatorFromPlaylist(pl.id, numId);
    }
  }
  return await getAllPlaylists();
}

// ==========================================
// CATEGORIES MANAGEMENT
// ==========================================
async function ensureDefaultCategories() {
  if (isDbConnected()) {
    try {
      const chk = await query('SELECT COUNT(*) FROM categories');
      if (chk.rows && Number(chk.rows[0].count) === 0) {
        for (const cat of preloadedData.categories || []) {
          await query(
            `INSERT INTO categories (id, name, description, color, icon)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (name) DO NOTHING`,
            [cat.id, cat.name, cat.description || '', cat.color || '#0284C7', cat.icon || 'ti-category']
          );
        }
      }
    } catch (e) {
      console.warn('Categories ensure error:', e.message);
    }
  }
}

async function getAllCategories() {
  if (isDbConnected()) {
    await ensureDefaultCategories();
    const res = await query('SELECT * FROM categories ORDER BY created_at ASC, name ASC');
    const dbCats = res.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description || '',
      color: row.color || '#0284C7',
      icon: row.icon || 'ti-category',
      created_at: row.created_at
    }));

    // Auto-discover any categories present on existing creators not yet in table
    const creatorCats = await query('SELECT DISTINCT category FROM creators WHERE category IS NOT NULL AND category != \'\'');
    const existingNames = new Set(dbCats.map(c => c.name.toLowerCase()));
    for (const r of creatorCats.rows) {
      const catName = (r.category || '').trim();
      if (catName && !existingNames.has(catName.toLowerCase())) {
        const catId = `cat-${catName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
        try {
          await query(
            `INSERT INTO categories (id, name, description, color, icon)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (name) DO NOTHING`,
            [catId, catName, '', '#4F46E5', 'ti-tag']
          );
          dbCats.push({ id: catId, name: catName, description: '', color: '#4F46E5', icon: 'ti-tag' });
          existingNames.add(catName.toLowerCase());
        } catch (e) {}
      }
    }
    return dbCats;
  }
  return memoryStore.categories;
}

async function getCategoryByName(name) {
  const all = await getAllCategories();
  return all.find(c => c.name.toLowerCase() === (name || '').toLowerCase()) || null;
}

async function createCategory(data) {
  const name = (data.name || '').trim();
  if (!name) throw new Error('Category name is required');
  const id = data.id || `cat-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}_${Date.now()}`;
  const description = (data.description || '').trim();
  const color = data.color || '#0284C7';
  const icon = data.icon || 'ti-category';

  if (isDbConnected()) {
    const res = await query(
      `INSERT INTO categories (id, name, description, color, icon)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description, color = EXCLUDED.color, icon = EXCLUDED.icon
       RETURNING *`,
      [id, name, description, color, icon]
    );
    const row = res.rows[0];
    return {
      id: row.id,
      name: row.name,
      description: row.description || '',
      color: row.color || '#0284C7',
      icon: row.icon || 'ti-category',
      created_at: row.created_at
    };
  }

  const existingIdx = memoryStore.categories.findIndex(c => c.name.toLowerCase() === name.toLowerCase());
  const newCat = { id, name, description, color, icon, created_at: new Date().toISOString() };
  if (existingIdx > -1) {
    memoryStore.categories[existingIdx] = newCat;
  } else {
    memoryStore.categories.push(newCat);
  }
  return newCat;
}

async function updateCategory(oldName, data) {
  const targetName = (oldName || '').trim();
  const newName = (data.name || targetName).trim();
  const description = data.description !== undefined ? data.description.trim() : undefined;
  const color = data.color;
  const icon = data.icon;

  if (isDbConnected()) {
    if (newName && newName !== targetName) {
      await query('UPDATE creators SET category = $1 WHERE category = $2', [newName, targetName]);
    }
    const res = await query(
      `UPDATE categories
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           color = COALESCE($3, color),
           icon = COALESCE($4, icon)
       WHERE name = $5
       RETURNING *`,
      [newName || null, description !== undefined ? description : null, color || null, icon || null, targetName]
    );
    if (!res.rows.length) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      name: row.name,
      description: row.description || '',
      color: row.color || '#0284C7',
      icon: row.icon || 'ti-category',
      created_at: row.created_at
    };
  }

  const cat = memoryStore.categories.find(c => c.name.toLowerCase() === targetName.toLowerCase());
  if (!cat) return null;
  if (newName && newName !== targetName) {
    memoryStore.creators.forEach(c => { if (c.category === targetName) c.category = newName; });
    cat.name = newName;
  }
  if (description !== undefined) cat.description = description;
  if (color) cat.color = color;
  if (icon) cat.icon = icon;
  return cat;
}

async function deleteCategory(name, fallbackCategory = 'General Tech') {
  const targetName = (name || '').trim();
  if (isDbConnected()) {
    await query('UPDATE creators SET category = $1 WHERE category = $2', [fallbackCategory, targetName]);
    const res = await query('DELETE FROM categories WHERE name = $1 RETURNING id', [targetName]);
    return res.rowCount > 0;
  }
  memoryStore.creators.forEach(c => { if (c.category === targetName) c.category = fallbackCategory; });
  const prevLen = memoryStore.categories.length;
  memoryStore.categories = memoryStore.categories.filter(c => c.name.toLowerCase() !== targetName.toLowerCase());
  return memoryStore.categories.length < prevLen;
}

async function addCreatorToCategory(creatorId, categoryName) {
  const numId = Number(creatorId);
  const cat = (categoryName || '').trim();
  if (isDbConnected()) {
    const res = await query('UPDATE creators SET category = $1 WHERE id = $2 RETURNING *', [cat, numId]);
    return res.rows.length > 0;
  }
  const creator = memoryStore.creators.find(c => c.id === numId);
  if (!creator) return false;
  creator.category = cat;
  return true;
}

async function removeCreatorFromCategory(creatorId) {
  return await addCreatorToCategory(creatorId, 'Unassigned');
}

// ==========================================
// SEED & RESET DATABASE
// ==========================================
async function seedDatabase(customData = null) {
  const data = customData || preloadedData;

  if (isDbConnected()) {
    // Clear existing records
    await query('TRUNCATE TABLE reels, creators, inspirations, viral_alerts, quick_notes, playlists CASCADE;');

    // Insert creators
    for (const c of data.creators || []) {
      const followers = parseFollowers(c.followers);

      await query(
        `INSERT INTO creators (id, name, handle, followers, growth, eng, avg_v, category, badge, tags, freq, notes, checked, avatar, pinned)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $12, $13, $14, $15)`,
        [
          c.id,
          c.name,
          c.handle,
          followers,
          c.growth || '',
          c.eng || '',
          c.avgV || '',
          c.category || 'Tech Hacks',
          c.badge || 'none',
          JSON.stringify(sanitizeTags(c.tags)),
          c.freq || '',
          c.notes || '',
          sanitizeDate(c.checked),
          c.avatar || null,
          Boolean(c.pinned)
        ]
      );
    }

    // Insert reels
    for (const r of data.reels || []) {
      await query(
        `INSERT INTO reels (id, cid, topic, date, views, format, hook, viral, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          r.id,
          r.cid,
          r.topic,
          r.date || null,
          r.views || '',
          r.format || 'Reel',
          r.hook || '',
          Boolean(r.viral),
          r.notes || ''
        ]
      );
    }

    // Insert inspirations
    for (const ins of data.inspirations || []) {
      await query(
        `INSERT INTO inspirations (id, creator, type, note, tags, date)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6)`,
        [
          ins.id,
          ins.creator || '',
          ins.type || 'Hook',
          ins.note,
          JSON.stringify(ins.tags || []),
          ins.date || null
        ]
      );
    }

    // Insert viral alerts
    for (const a of data.viralAlerts || []) {
      await query(
        `INSERT INTO viral_alerts (id, creator, note, date)
         VALUES ($1, $2, $3, $4)`,
        [a.id, a.creator, a.note, a.date || null]
      );
    }

    // Insert quick notes
    if (data.qNotes) {
      await query(
        `INSERT INTO quick_notes (id, content) VALUES (1, $1)
         ON CONFLICT (id) DO UPDATE SET content = EXCLUDED.content, updated_at = NOW()`,
        [data.qNotes]
      );
    }

    // Insert playlists
    for (const pl of data.playlists || []) {
      await query(
        `INSERT INTO playlists (id, name, description, color, icon, creator_ids)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb)
         ON CONFLICT (id) DO NOTHING`,
        [pl.id, pl.name, pl.description || '', pl.color || '#7B2FBE', pl.icon || 'ti-playlist', JSON.stringify(pl.creator_ids || [])]
      );
    }

    // Insert categories
    for (const cat of data.categories || []) {
      await query(
        `INSERT INTO categories (id, name, description, color, icon)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (name) DO NOTHING`,
        [cat.id, cat.name, cat.description || '', cat.color || '#0284C7', cat.icon || 'ti-category']
      );
    }

    console.log(`✅ Seeded ${data.creators?.length || 0} creators, playlists, categories, and associated records into PostgreSQL Neon DB.`);
    return { success: true, count: data.creators?.length || 0, source: 'postgres' };
  } else {
    memoryStore = {
      creators: JSON.parse(JSON.stringify(data.creators || [])),
      reels: JSON.parse(JSON.stringify(data.reels || [])),
      inspirations: JSON.parse(JSON.stringify(data.inspirations || [])),
      viralAlerts: JSON.parse(JSON.stringify(data.viralAlerts || [])),
      playlists: JSON.parse(JSON.stringify(data.playlists || [])),
      categories: JSON.parse(JSON.stringify(data.categories || [])),
      qNotes: data.qNotes || ''
    };
    return { success: true, count: memoryStore.creators.length, source: 'memory_fallback' };
  }
}

module.exports = {
  getAllCreators,
  getCreatorById,
  createCreator,
  updateCreator,
  deleteCreator,
  togglePin,
  markChecked,
  getAllReels,
  createReel,
  updateReel,
  deleteReel,
  getAllInspirations,
  createInspiration,
  deleteInspiration,
  getAllAlerts,
  createAlert,
  deleteAlert,
  getQuickNotes,
  saveQuickNotes,
  getAllPlaylists,
  getPlaylistById,
  createPlaylist,
  updatePlaylist,
  deletePlaylist,
  addCreatorToPlaylist,
  removeCreatorFromPlaylist,
  setCreatorPlaylists,
  getAllCategories,
  getCategoryByName,
  createCategory,
  updateCategory,
  deleteCategory,
  addCreatorToCategory,
  removeCreatorFromCategory,
  seedDatabase
};
