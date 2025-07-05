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
  addAchievement,
  getCommissionRates,
  updateCommissionRates
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

// Get MLM commission rates
router.get('/mlm-commission', protect, admin, getCommissionRates);
// Update MLM commission rates
router.put('/mlm-commission', protect, admin, updateCommissionRates);

module.exports = router;