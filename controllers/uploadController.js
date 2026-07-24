const cloudinary = require('../config/cloudinary');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage() });

async function uploadImage(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const streamUpload = () => new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'mission2k38',
          resource_type: 'image'
        },
        (error, result) => {
          if (result) resolve(result);
          else reject(error);
        }
      );

      stream.end(req.file.buffer);
    });

    const result = await streamUpload();

    return res.json({
      secure_url: result.secure_url,
      public_id: result.public_id
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Image upload failed' });
  }
}

module.exports = {
  upload,
  uploadImage
};
