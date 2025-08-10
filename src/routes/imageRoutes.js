const express = require('express');
const multer = require('multer');
const imageController = require('../controllers/imageController');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

// Configure multer for handling file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Routes
router.post('/upload', protect, admin, upload.single('image'), imageController.uploadImage);
router.delete('/:fileId', protect, admin, imageController.deleteImage);
router.get('/auth-params', protect, admin, imageController.getAuthParams);

module.exports = router;
