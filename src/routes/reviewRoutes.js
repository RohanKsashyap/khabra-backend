const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const {
  getProductReviews,
  addReview,
  updateReview,
  deleteReview,
  toggleLike,
  getAllReviews,
  updateReviewStatus
} = require('../controllers/reviewController');

// Public routes
router.get('/product/:productId', getProductReviews);

// Protected routes
router.use(protect);
router.post('/', addReview);
router.put('/:id', updateReview);
router.delete('/:id', deleteReview);
router.post('/:id/like', toggleLike);

// Admin routes
router.use(admin);
router.get('/admin', getAllReviews);
router.put('/admin/:id/status', updateReviewStatus);

module.exports = router; 