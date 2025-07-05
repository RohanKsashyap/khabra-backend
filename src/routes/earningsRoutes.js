const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getUserEarnings,
  getAllEarnings,
  clearUserEarnings,
  clearAllEarnings,
} = require('../controllers/earningsController');
const { admin } = require('../middleware/authMiddleware');

// @route   GET /api/earnings
// @desc    Get logged-in user's earnings
// @access  Private
router.route('/')
  .get(protect, getUserEarnings)
  .delete(protect, clearUserEarnings);

// @route   GET /api/earnings/all
// @desc    Get all users' earnings (admin)
// @access  Private/Admin
router.get('/all', protect, admin, getAllEarnings);

// @route   DELETE /api/earnings/admin/clear-all
// @desc    Clear all users' earnings (admin)
// @access  Private/Admin
router.delete('/admin/clear-all', protect, admin, clearAllEarnings);

module.exports = router; 