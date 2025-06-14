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

module.exports = router; 