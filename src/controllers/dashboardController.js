const asyncHandler = require('../middleware/asyncHandler');
const Earning = require('../models/Earning');
const Order = require('../models/Order');
const Network = require('../models/Network');
const UserRank = require('../models/UserRank');
const Rank = require('../models/Rank');

// @desc    Get dashboard overview stats
// @route   GET /api/dashboard/overview
// @access  Private
exports.getDashboardOverview = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;

  // --- Earnings ---
  const earnings = await Earning.find({ user: userId });
  const totalEarnings = earnings.reduce((sum, earning) => sum + earning.amount, 0);
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const earningsThisMonth = earnings
    .filter(earning => new Date(earning.date) >= firstDayOfMonth)
    .reduce((sum, earning) => sum + earning.amount, 0);

  // --- Orders & Personal PV ---
  const orders = await Order.find({ user: userId });
  const totalOrders = orders.length;
  const ordersThisMonth = orders.filter(
    order => new Date(order.createdAt) >= firstDayOfMonth
  ).length;

  // Assuming 1 currency unit = 1 PV for simplicity.
  const personalPV = orders.reduce((sum, order) => sum + order.totalAmount, 0);
  const personalPVThisMonth = orders
    .filter(order => new Date(order.createdAt) >= firstDayOfMonth)
    .reduce((sum, order) => sum + order.totalAmount, 0);
    
  // --- Network ---
  const network = await Network.findOne({ user: userId });
  const totalTeam = network ? network.teamStats.totalMembers : 0;
  const newMembersThisMonth = network 
    ? network.directReferrals.filter(
        ref => new Date(ref.joinedAt) >= firstDayOfMonth
      ).length
    : 0;

  // --- Rank Progress ---
  let rankData;
  let userRank = await UserRank.findOne({ user: userId }).populate('currentRank');

  if (userRank) {
    const nextRank = await Rank.findOne({ level: userRank.currentRank.level + 1 });
    rankData = {
      current: userRank.currentRank,
      next: nextRank,
      progress: userRank.progress,
    };
  } else {
    const lowestRank = await Rank.findOne().sort({ level: 1 });
    if (lowestRank) {
      const nextRank = await Rank.findOne({ level: lowestRank.level + 1 });
      rankData = {
        current: lowestRank,
        next: nextRank,
        progress: { directReferrals: 0, teamSize: 0, teamSales: 0 },
      };
    } else {
      // No ranks in the system
      rankData = {
        current: null,
        next: null,
        progress: { directReferrals: 0, teamSize: 0, teamSales: 0 },
      };
    }
  }

  res.status(200).json({
    success: true,
    data: {
      earnings: {
        total: totalEarnings,
        thisMonth: earningsThisMonth,
      },
      orders: {
        total: totalOrders,
        thisMonth: ordersThisMonth,
      },
      team: {
        total: totalTeam,
        newThisMonth: newMembersThisMonth,
      },
      personalPV: {
        total: personalPV,
        thisMonth: personalPVThisMonth,
      },
      rank: rankData,
    },
  });
}); 