const { query, isDbConnected } = require('../config/db');
const preloadedData = require('../data/preloaded.json');

// In-memory fallback state in case database is not connected yet
let memoryStore = {
  creators: JSON.parse(JSON.stringify(preloadedData.creators || [])),
  reels: JSON.parse(JSON.stringify(preloadedData.reels || [])),
  inspirations: JSON.parse(JSON.stringify(preloadedData.inspirations || [])),
  viralAlerts: JSON.parse(JSON.stringify(preloadedData.viralAlerts || [])),
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
    return res.rowCount > 0;
  }
  const prevLen = memoryStore.creators.length;
  memoryStore.creators = memoryStore.creators.filter(c => c.id !== numId);
  memoryStore.reels = memoryStore.reels.filter(r => r.cid !== numId);
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
// SEED & RESET DATABASE
// ==========================================
async function seedDatabase(customData = null) {
  const data = customData || preloadedData;

  if (isDbConnected()) {
    // Clear existing records
    await query('TRUNCATE TABLE reels, creators, inspirations, viral_alerts, quick_notes CASCADE;');

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

    console.log(`✅ Seeded ${data.creators?.length || 0} creators and associated records into PostgreSQL Neon DB.`);
    return { success: true, count: data.creators?.length || 0, source: 'postgres' };
  } else {
    memoryStore = {
      creators: JSON.parse(JSON.stringify(data.creators || [])),
      reels: JSON.parse(JSON.stringify(data.reels || [])),
      inspirations: JSON.parse(JSON.stringify(data.inspirations || [])),
      viralAlerts: JSON.parse(JSON.stringify(data.viralAlerts || [])),
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
  seedDatabase
};
