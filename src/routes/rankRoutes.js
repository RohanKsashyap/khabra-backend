const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const {
  getRanks,
  getRank,
  createRank,
  updateRank,
  deleteRank,
  getUserRank,
  updateUserRankProgress,
  addAchievement
} = require('../controllers/rankController');

// Public routes
router.get('/', getRanks);
router.get('/:id', getRank);

// Protected user routes
router.get('/user/my-status', protect, getUserRank);
router.put('/user/progress', protect, updateUserRankProgress);
router.post('/user/achievement', protect, addAchievement);

// Admin routes
router.post('/', protect, admin, createRank);
router.put('/:id', protect, admin, updateRank);
router.delete('/:id', protect, admin, deleteRank);

module.exports = router;