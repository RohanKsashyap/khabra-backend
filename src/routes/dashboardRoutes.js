const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getAdminDashboardOverview,
  getRealTimeStats,
  getDashboardOverview,
  getUserSalesOverview
} = require('../controllers/dashboardController');

// Get regular user dashboard overview
router.get('/overview', protect, getDashboardOverview);

// Get comprehensive admin dashboard overview (admin specific)
router.get('/admin/overview', protect, authorize('admin'), getAdminDashboardOverview);

// Get real-time dashboard statistics
router.get('/admin/realtime', protect, authorize('admin'), getRealTimeStats);

// Get detailed user sales overview with downline tracking (admin specific)
router.get('/admin/user-sales/:userId', protect, authorize('admin'), getUserSalesOverview);

module.exports = router;
