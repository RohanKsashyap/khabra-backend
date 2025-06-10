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

// Protected routes
router.use(protect);
router.get('/user/rank', getUserRank);
router.put('/user/progress', updateUserRankProgress);
router.post('/user/achievement', addAchievement);

// Admin routes
router.use(admin);
router.post('/', createRank);
router.put('/:id', updateRank);
router.delete('/:id', deleteRank);

module.exports = router; 