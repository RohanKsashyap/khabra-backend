const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getNetwork,
  addReferral,
  updateNetworkStats,
  getNetworkPerformance,
  updateNetworkPerformance,
  getNetworkTree
} = require('../controllers/networkController');

// All routes are protected
router.use(protect);

// Get user's network
router.get('/', getNetwork);

// Add a new referral
router.post('/referral', addReferral);

// Update network stats
router.put('/stats', updateNetworkStats);

// Get network performance
router.get('/performance', getNetworkPerformance);

// Update network performance
router.put('/performance', updateNetworkPerformance);

// Admin: Get any user's downline tree up to 5 levels
router.get('/tree/:userId', getNetworkTree);

module.exports = router; 