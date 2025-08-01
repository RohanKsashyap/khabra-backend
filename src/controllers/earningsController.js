const Earning = require('../models/Earning');
const asyncHandler = require('../middleware/asyncHandler');

// @route   GET /api/earnings
// @desc    Get logged-in user's earnings
// @access  Private
const getUserEarnings = asyncHandler(async (req, res) => {
  const earnings = await Earning.find({ user: req.user.id }).sort({ date: -1 });

  const totalEarnings = earnings.reduce((sum, earning) => sum + earning.amount, 0);
  const pendingEarnings = earnings
    .filter(earning => earning.status === 'pending')
    .reduce((sum, earning) => sum + earning.amount, 0);

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
});

// @route   GET /api/earnings/all
// @desc    Get all users' earnings (admin only)
// @access  Private/Admin
const getAllEarnings = asyncHandler(async (req, res) => {
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
});

// @route   DELETE /api/earnings
// @desc    Clear all earnings for the logged-in user
// @access  Private
const clearUserEarnings = asyncHandler(async (req, res) => {
  await Earning.deleteMany({ user: req.user.id });
  res.status(200).json({
    success: true,
    message: 'Earnings history cleared successfully.',
  });
});

// @route   DELETE /api/earnings/admin/clear-all
// @desc    Clear all earnings for all users (admin only)
// @access  Private/Admin
const clearAllEarnings = asyncHandler(async (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden' });
  }
  await Earning.deleteMany({});
  const count = await Earning.countDocuments({});
  console.log('Earnings remaining after clear:', count);
  res.status(200).json({
    success: true,
    message: 'All users\' earnings history cleared successfully.',
    remaining: count,
  });
});

module.exports = {
  getUserEarnings,
  getAllEarnings,
  clearUserEarnings,
  clearAllEarnings,
}; 