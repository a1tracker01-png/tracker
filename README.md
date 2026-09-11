# Qurion Competitor Tracker — Fullstack Architecture

A complete fullstack competitor analysis and tracking platform built with **Node.js**, **Express**, **PostgreSQL (Neon DB)**, and **Cloudinary**.

---

## 🌟 Key Architecture & Features

1. **Backend Server (Node.js + Express)**:
   - Serves the frontend as static files from `/public`.
   - RESTful API endpoints for competitors, reels, inspirations, viral alerts, quick notes, seed/reset, and uploads.
   - Graceful fallback: If Neon DB or Cloudinary credentials are not configured yet, the app safely boots with preloaded in-memory data and informs you in the console, so you can test immediately.

2. **Database (PostgreSQL Neon DB)**:
   - Stores all competitors, tracked reels, viral alerts, inspirations, and notes with relational tables:
     - `creators`: Competitor profiles, follower count, engagement rate, average views, category, badge, tags, notes, checked dates, pin status, and Cloudinary avatar URL.
     - `reels`: Tracked reels with views, hook types, formats, viral status, and notes.
     - `inspirations`: Saved inspiration cards with category type, notes, tags, and creator name.
     - `viral_alerts`: Active viral alerts and history tracking.
     - `quick_notes`: Freeform notepad.
   - Automatic migrations: Tables are created automatically on server boot or during `npm run seed`.

3. **Cloud Storage (Cloudinary)**:
   - Profile pictures and avatars uploaded from the "Add Competitor", "Edit Competitor", or inline photo change on cards are uploaded directly to **Cloudinary**.
   - Cloudinary returns secure HTTPS URLs stored in the PostgreSQL database.

4. **Frontend UI (100% Identical Visuals & Features)**:
   - Categorization, category counts, filter by badges (🔥 Trending, 📈 Growing, ⚡ Viral, 👀 Watch, 💤 Inactive).
   - Instant search across name and handle.
   - Sorting (Pinned first, by followers, by name, by last checked, overdue checks first).
   - Side-by-side creator comparison (Head-to-head metrics).
   - Content pattern analysis (Hook types, formats, category distribution).
   - Top viral reels leaderboard & follower rankings.
   - Weekly summary & Indian audience posting time suggestions.
   - Monthly competitor posting calendar.
   - Inspiration library and active viral alert tracking.
   - Data Backup & Restore (JSON) and CSV export.
   - Light and Dark mode.

---

## 🚀 Quick Setup & Installation

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables (`.env`)

Edit `.env` (or copy from `.env.example`):

```env
PORT=3000

# Neon DB Connection String
DATABASE_URL=postgresql://username:password@ep-xyz-123456.region.aws.neon.tech/neondb?sslmode=require

# Cloudinary Credentials (from your Cloudinary Dashboard)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 3. Seed the Database

To initialize the database tables and populate all **48 initial competitors**, reels, inspirations, viral alerts, and notes:

```bash
npm run seed
```

### 4. Start the Server

```bash
npm start
# or for development auto-reload:
npm run dev
```

Open your browser at:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 📁 Project Structure

```
qurion_competitor_tracker_developer_package/
├── package.json               # Node.js dependencies & scripts
├── server.js                  # Express application entrypoint
├── .env                       # Environment variables
├── .env.example               # Template environment configuration
├── README.md                  # Project documentation
├── config/
│   ├── db.js                  # Neon PostgreSQL pool & auto-migrations
│   └── cloudinary.js          # Cloudinary configuration & upload stream
├── models/
│   └── dataStore.js           # Database queries with in-memory fallback
├── routes/
│   ├── creators.js            # Competitor CRUD, pin, mark-checked
│   ├── reels.js               # Reel CRUD
│   ├── inspirations.js        # Inspiration CRUD
│   ├── alerts.js              # Viral alert CRUD
│   ├── notes.js               # Quick notes save/get
│   ├── upload.js              # Multer + Cloudinary image upload endpoint
│   └── seed.js                # Database reset & seed API
├── data/
│   └── preloaded.json         # Complete 48-creator seed dataset
├── scripts/
│   └── seed.js                # CLI seed script (npm run seed)
├── public/
│   └── index.html             # Full UI with backend integration
└── Competitor Analyst.html    # Original standalone HTML preserved
```
