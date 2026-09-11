require('dotenv').config();
const { initDB, query, isDbConnected } = require('../config/db');
const preloaded = require('../data/preloaded.json');
const dataStore = require('../models/dataStore');

async function run() {
  console.log('🌱 Starting database seed script for Qurion Competitor Tracker...');

  const initialized = await initDB();
  if (!initialized) {
    console.error('❌ Could not connect to Neon PostgreSQL database.');
    console.error('👉 Please make sure DATABASE_URL is properly set in your .env file.');
    console.error('👉 Example: DATABASE_URL=postgresql://username:password@ep-xyz.region.aws.neon.tech/neondb?sslmode=require');
    process.exit(1);
  }

  try {
    const result = await dataStore.seedDatabase(preloaded);
    console.log(`🎉 Successfully seeded ${result.count} competitors, plus reels, viral alerts, and inspirations into Neon DB!`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error during seeding:', err);
    process.exit(1);
  }
}

run();
