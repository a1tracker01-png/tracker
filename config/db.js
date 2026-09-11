const { Pool } = require('pg');
require('dotenv').config();

let pool = null;
let isConnected = false;

function cleanConnectionString(url) {
  if (!url) return url;
  // Node.js 'pg' driver does not support channel_binding=require (which is a libpq-only feature)
  // Neon includes it in some psql connection strings, causing timeouts in Node.js
  return url
    .replace(/[?&]channel_binding=[^&]+/g, '')
    .replace(/\?&/, '?')
    .replace(/\?$/, '');
}

function getPool() {
  if (pool) return pool;

  let connectionString = process.env.DATABASE_URL;
  if (!connectionString || connectionString.includes('username:password@ep-xyz')) {
    console.warn('⚠️  DATABASE_URL is not configured or using placeholder credentials. Please set your Neon DB connection string in .env');
    return null;
  }

  connectionString = cleanConnectionString(connectionString);

  try {
    const isSslNeeded = connectionString.includes('neon.tech') || 
                        connectionString.includes('sslmode=require') || 
                        process.env.NODE_ENV === 'production';

    pool = new Pool({
      connectionString,
      ssl: isSslNeeded ? { rejectUnauthorized: false } : undefined,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 15000 // 15 seconds to allow Neon cold start
    });

    pool.on('error', (err) => {
      console.error('Unexpected error on idle PostgreSQL client:', err);
    });

    return pool;
  } catch (err) {
    console.error('Error creating PostgreSQL pool:', err);
    return null;
  }
}

async function initDB() {
  const p = getPool();
  if (!p) {
    console.warn('⚠️  Skipping DB table migration: Database not configured.');
    return false;
  }

  try {
    const client = await p.connect();
    try {
      console.log('✅ Connected to PostgreSQL Neon database.');
      isConnected = true;

      // Run initial migrations
      await client.query(`
        CREATE TABLE IF NOT EXISTS creators (
          id BIGINT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          handle VARCHAR(255) NOT NULL,
          followers BIGINT DEFAULT 0,
          growth VARCHAR(100),
          eng VARCHAR(50),
          avg_v VARCHAR(50),
          category VARCHAR(100),
          badge VARCHAR(50),
          tags JSONB DEFAULT '[]'::jsonb,
          freq VARCHAR(100),
          notes TEXT,
          checked DATE,
          avatar TEXT,
          pinned BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS reels (
          id BIGINT PRIMARY KEY,
          cid BIGINT REFERENCES creators(id) ON DELETE CASCADE,
          topic TEXT NOT NULL,
          date DATE,
          views VARCHAR(100),
          format VARCHAR(100),
          hook VARCHAR(255),
          viral BOOLEAN DEFAULT FALSE,
          notes TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS inspirations (
          id BIGINT PRIMARY KEY,
          creator VARCHAR(255),
          type VARCHAR(100),
          note TEXT NOT NULL,
          tags JSONB DEFAULT '[]'::jsonb,
          date DATE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS viral_alerts (
          id BIGINT PRIMARY KEY,
          creator VARCHAR(255) NOT NULL,
          note TEXT NOT NULL,
          date DATE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS quick_notes (
          id INT PRIMARY KEY DEFAULT 1,
          content TEXT,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);

      console.log('✅ Database tables initialized successfully.');
      return true;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('❌ Failed to connect to PostgreSQL / run migration:', err.message);
    isConnected = false;
    return false;
  }
}

async function query(text, params) {
  const p = getPool();
  if (!p) {
    throw new Error('Database is not configured. Please set a valid DATABASE_URL in .env');
  }
  return p.query(text, params);
}

module.exports = {
  getPool,
  initDB,
  query,
  isDbConnected: () => isConnected
};
