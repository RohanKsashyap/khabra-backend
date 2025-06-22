const express = require('express');
const router = express.Router();
const { getDashboardOverview } = require('../controllers/dashboardController');
const { protect } = require('../middleware/authMiddleware');

// @route   GET /api/dashboard/overview
// @desc    Get dashboard overview stats for the logged-in user
// @access  Private
router.get('/overview', protect, getDashboardOverview);

module.exports = router; 