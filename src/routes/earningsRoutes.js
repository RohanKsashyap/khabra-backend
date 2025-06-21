const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Earning = require('../models/Earning');

// @route   GET /api/users/earnings
// @desc    Get user earnings
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    // Get earnings for the current user
    const earnings = await Earning.find({ user: req.user.id })
      .sort({ date: -1 });

    // Calculate stats
    const totalEarnings = earnings.reduce((sum, earning) => sum + earning.amount, 0);
    const pendingEarnings = earnings
      .filter(earning => earning.status === 'pending')
      .reduce((sum, earning) => sum + earning.amount, 0);

    // Get current month and last month earnings
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const thisMonth = earnings
      .filter(earning => new Date(earning.date) >= firstDayOfMonth)
      .reduce((sum, earning) => sum + earning.amount, 0);

    const lastMonth = earnings
      .filter(earning => 
        new Date(earning.date) >= firstDayOfLastMonth && 
        new Date(earning.date) <= lastDayOfLastMonth
      )
      .reduce((sum, earning) => sum + earning.amount, 0);

    const stats = {
      totalEarnings,
      pendingEarnings,
      thisMonth,
      lastMonth
    };

    res.json({ earnings, stats });
  } catch (error) {
    console.error('Error fetching earnings:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @route   GET /api/earnings/all
// @desc    Get all users' earnings (admin only)
// @access  Private/Admin
router.get('/all', protect, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied' });
  }
  try {
    const { user, status, type, startDate, endDate } = req.query;
    const filter = {};
    if (user) filter.user = user;
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }
    const earnings = await Earning.find(filter)
      .populate('user', 'name email')
      .sort({ date: -1 });
    res.json({ earnings });
  } catch (error) {
    console.error('Error fetching all earnings:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router; 