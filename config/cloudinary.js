const cloudinary = require('cloudinary').v2;
require('dotenv').config();

const isConfigured = 
  process.env.CLOUDINARY_CLOUD_NAME && 
  process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloud_name' &&
  process.env.CLOUDINARY_API_KEY && 
  process.env.CLOUDINARY_API_KEY !== 'your_api_key' &&
  process.env.CLOUDINARY_API_SECRET && 
  process.env.CLOUDINARY_API_SECRET !== 'your_api_secret';

if (isConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
  console.log('✅ Cloudinary configured successfully.');
} else {
  console.warn('⚠️  Cloudinary is not configured with real credentials in .env. Image uploads will use local/base64 fallback until valid credentials are added.');
}

/**
 * Upload a file buffer to Cloudinary with automatic fallback
 * @param {Buffer} buffer - File buffer from multer
 * @param {string} folder - Destination folder in Cloudinary
 * @param {string} mimetype - File MIME type
 * @returns {Promise<string>} - Secure HTTPS URL or data URI fallback
 */
function uploadToCloudinary(buffer, folder = 'qurion_competitors', mimetype = 'image/jpeg') {
  return new Promise((resolve) => {
    const fallbackDataUri = `data:${mimetype};base64,${buffer.toString('base64')}`;

    if (!isConfigured) {
      return resolve(fallbackDataUri);
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image'
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error.message || error);
          if (error.http_code === 403 || (error.message && error.message.includes('missing permissions'))) {
            console.warn('👉 Tip: Your Cloudinary API Key is missing the "create" permission.');
            console.warn('👉 In Cloudinary Console: Settings -> Access Keys -> ensure the key has "create" permission or use the Master Key.');
          }
          console.warn('⚠️ Falling back to data URI so competitor creation succeeds without error.');
          return resolve(fallbackDataUri);
        }
        resolve(result.secure_url);
      }
    );

    uploadStream.end(buffer);
  });
}

module.exports = {
  cloudinary,
  isCloudinaryConfigured: () => isConfigured,
  uploadToCloudinary
};
