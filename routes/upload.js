const express = require('express');
const router = express.Router();
const multer = require('multer');
const { uploadToCloudinary, isCloudinaryConfigured } = require('../config/cloudinary');

// Multer memory storage (keeps file in memory buffer for streaming to Cloudinary)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// POST /api/upload
router.post('/', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded' });
    }

    const url = await uploadToCloudinary(req.file.buffer, 'qurion_competitors', req.file.mimetype);
    res.json({
      url,
      source: url.startsWith('http') ? 'cloudinary' : 'fallback',
      message: url.startsWith('http')
        ? 'Image uploaded to Cloudinary successfully'
        : 'Image saved with fallback (Check Cloudinary API Key permissions)'
    });
  } catch (err) {
    console.error('Image upload endpoint error:', err);
    if (req.file) {
      const fallbackUrl = `data:${req.file.mimetype || 'image/jpeg'};base64,${req.file.buffer.toString('base64')}`;
      return res.json({ url: fallbackUrl, warning: err.message });
    }
    res.status(500).json({ error: 'Failed to process image: ' + err.message });
  }
});

module.exports = router;
