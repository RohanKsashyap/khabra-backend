const User = require('../models/User');
const Order = require('../models/Order');
const Franchise = require('../models/Franchise');
const Product = require('../models/Product');
const WithdrawalRequest = require('../models/WithdrawalRequest');
const Earning = require('../models/Earning');
const UserRank = require('../models/UserRank');
const Rank = require('../models/Rank');
const asyncHandler = require('../middleware/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get comprehensive admin dashboard statistics
// @route   GET /api/dashboard/admin/overview
// @access  Private/Admin
exports.getAdminDashboardOverview = asyncHandler(async (req, res, next) => {
  const { dateRange = 'all' } = req.query;
  
  // Calculate date filters
  let dateFilter = {};
  const now = new Date();
  
  switch (dateRange) {
    case 'today':
      dateFilter = {
        createdAt: {
          $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
          $lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
        }
      };
      break;
    case 'week':
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      dateFilter = { createdAt: { $gte: weekAgo } };
      break;
    case 'month':
      dateFilter = {
        createdAt: {
          $gte: new Date(now.getFullYear(), now.getMonth(), 1)
        }
      };
      break;
    case 'year':
      dateFilter = {
        createdAt: {
          $gte: new Date(now.getFullYear(), 0, 1)
        }
      };
      break;
    default:
      // 'all' - no date filter
      break;
  }

  // Get total sales and orders
  const salesAggregation = [
    { $match: { status: 'delivered', ...dateFilter } },
    {
      $group: {
        _id: null,
        totalSales: { $sum: '$totalAmount' },
        totalOrders: { $sum: 1 },
        onlineSales: {
          $sum: {
            $cond: [{ $eq: ['$orderType', 'online'] }, '$totalAmount', 0]
          }
        },
        offlineSales: {
          $sum: {
            $cond: [{ $eq: ['$orderType', 'offline'] }, '$totalAmount', 0]
          }
        },
        franchiseSales: {
          $sum: {
            $cond: [{ $ne: ['$franchise', null] }, '$totalAmount', 0]
          }
        },
        directSales: {
          $sum: {
            $cond: [{ $eq: ['$franchise', null] }, '$totalAmount', 0]
          }
        }
      }
    }
  ];

  const salesStats = await Order.aggregate(salesAggregation);
  const salesData = salesStats[0] || {
    totalSales: 0,
    totalOrders: 0,
    onlineSales: 0,
    offlineSales: 0,
    franchiseSales: 0,
    directSales: 0
  };

  // Get user statistics
  const userStats = await User.aggregate([
    {
      $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        activeUsers: {
          $sum: {
            $cond: [{ $eq: ['$status', 'active'] }, 1, 0]
          }
        },
        inactiveUsers: {
          $sum: {
            $cond: [{ $eq: ['$status', 'inactive'] }, 1, 0]
          }
        },
        franchises: {
          $sum: {
            $cond: [{ $eq: ['$role', 'franchise'] }, 1, 0]
          }
        },
        customers: {
          $sum: {
            $cond: [{ $eq: ['$role', 'user'] }, 1, 0]
          }
        }
      }
    }
  ]);

  const userData = userStats[0] || {
    totalUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    franchises: 0,
    customers: 0
  };

  // Get franchise statistics
  const franchiseStats = await Franchise.aggregate([
    {
      $group: {
        _id: null,
        totalFranchises: { $sum: 1 },
        activeFranchises: {
          $sum: {
            $cond: [{ $eq: ['$status', 'active'] }, 1, 0]
          }
        },
        totalCommissions: { $sum: '$commissionPercentage' }
      }
    }
  ]);

  const franchiseData = franchiseStats[0] || {
    totalFranchises: 0,
    activeFranchises: 0,
    totalCommissions: 0
  };

  // Get withdrawal statistics
  const withdrawalStats = await WithdrawalRequest.aggregate([
    {
      $group: {
        _id: null,
        pendingWithdrawals: {
          $sum: {
            $cond: [{ $eq: ['$status', 'pending'] }, '$amount', 0]
          }
        },
        totalWithdrawals: { $sum: '$amount' }
      }
    }
  ]);

  const withdrawalData = withdrawalStats[0] || {
    pendingWithdrawals: 0,
    totalWithdrawals: 0
  };

  // Get product count
  const productCount = await Product.countDocuments();

  // Get recent orders
  const recentOrders = await Order.find({ ...dateFilter })
    .populate('user', 'name email')
    .populate('franchise', 'name')
    .sort({ createdAt: -1 })
    .limit(10);

  // Get top franchises by sales
  const topFranchises = await Order.aggregate([
    { $match: { status: 'delivered', franchise: { $ne: null }, ...dateFilter } },
    {
      $lookup: {
        from: 'franchises',
        localField: 'franchise',
        foreignField: '_id',
        as: 'franchiseInfo'
      }
    },
    {
      $group: {
        _id: '$franchise',
        totalSales: { $sum: '$totalAmount' },
        franchiseName: { $first: { $arrayElemAt: ['$franchiseInfo.name', 0] } }
      }
    },
    { $sort: { totalSales: -1 } },
    { $limit: 5 }
  ]);

  // Get top products by sales
  const topProducts = await Order.aggregate([
    { $match: { status: 'delivered', ...dateFilter } },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.product',
        productName: { $first: '$items.productName' },
        totalSales: { $sum: { $multiply: ['$items.productPrice', '$items.quantity'] } },
        totalQuantity: { $sum: '$items.quantity' }
      }
    },
    { $sort: { totalSales: -1 } },
    { $limit: 5 }
  ]);

  // Get sales by month (last 12 months)
  const salesByMonth = await Order.aggregate([
    { $match: { status: 'delivered' } },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        },
        sales: { $sum: '$totalAmount' }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
    { $limit: 12 }
  ]);

  // Format sales by month data
  const formattedSalesByMonth = salesByMonth.map(item => ({
    month: new Date(item._id.year, item._id.month - 1).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric'
    }),
    sales: item.sales
  }));

  res.status(200).json({
    success: true,
    data: {
      sales: {
        totalSales: salesData.totalSales,
        totalOrders: salesData.totalOrders,
        onlineSales: salesData.onlineSales,
        offlineSales: salesData.offlineSales,
        franchiseSales: salesData.franchiseSales,
        directSales: salesData.directSales
      },
      users: {
        totalUsers: userData.totalUsers,
        activeUsers: userData.activeUsers,
        inactiveUsers: userData.inactiveUsers,
        franchises: userData.franchises,
        customers: userData.customers
      },
      franchises: {
        totalFranchises: franchiseData.totalFranchises,
        activeFranchises: franchiseData.activeFranchises,
        totalCommissions: franchiseData.totalCommissions
      },
      withdrawals: {
        pendingWithdrawals: withdrawalData.pendingWithdrawals,
        totalWithdrawals: withdrawalData.totalWithdrawals
      },
      products: {
        totalProducts: productCount
      },
      recentOrders,
      topFranchises,
      topProducts,
      salesByMonth: formattedSalesByMonth
    }
  });
});

// @desc    Get real-time dashboard updates
// @route   GET /api/dashboard/admin/realtime
// @access  Private/Admin
exports.getRealTimeStats = asyncHandler(async (req, res, next) => {
  // Get today's statistics
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

  const todayStats = await Order.aggregate([
    {
      $match: {
        status: 'delivered',
        createdAt: { $gte: todayStart, $lt: todayEnd }
      }
    },
    {
      $group: {
        _id: null,
        todaySales: { $sum: '$totalAmount' },
        todayOrders: { $sum: 1 }
      }
    }
  ]);

  // Get new users today
  const newUsersToday = await User.countDocuments({
    createdAt: { $gte: todayStart, $lt: todayEnd }
  });

  // Get pending orders
  const pendingOrders = await Order.countDocuments({ status: 'pending' });

  // Get pending withdrawals
  const pendingWithdrawals = await WithdrawalRequest.countDocuments({ status: 'pending' });

  res.status(200).json({
    success: true,
    data: {
      todaySales: todayStats[0]?.todaySales || 0,
      todayOrders: todayStats[0]?.todayOrders || 0,
      newUsersToday,
      pendingOrders,
      pendingWithdrawals
    }
  });
});

// @desc    Get regular user dashboard overview
// @route   GET /api/dashboard/overview
// @access  Private
exports.getDashboardOverview = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Get user's earnings
  const earnings = await Earning.aggregate([
    { $match: { user: userId } },
    {
      $group: {
        _id: null,
        total: { $sum: '$amount' },
        pending: {
          $sum: {
            $cond: [{ $eq: ['$status', 'pending'] }, '$amount', 0]
          }
        },
        paid: {
          $sum: {
            $cond: [{ $eq: ['$status', 'paid'] }, '$amount', 0]
          }
        },
        thisMonth: {
          $sum: {
            $cond: [
              { $gte: ['$createdAt', startOfMonth] },
              '$amount',
              0
            ]
          }
        }
      }
    }
  ]);

  const earningsData = earnings[0] || {
    total: 0,
    pending: 0,
    paid: 0,
    thisMonth: 0
  };

  // Get user's orders
  const orders = await Order.aggregate([
    { $match: { user: userId } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        thisMonth: {
          $sum: {
            $cond: [
              { $gte: ['$createdAt', startOfMonth] },
              1,
              0
            ]
          }
        }
      }
    }
  ]);

  const ordersData = orders[0] || {
    total: 0,
    thisMonth: 0
  };

  // Get user's team (downline)
  const team = await User.aggregate([
    { $match: { uplineId: userId } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        newThisMonth: {
          $sum: {
            $cond: [
              { $gte: ['$createdAt', startOfMonth] },
              1,
              0
            ]
          }
        }
      }
    }
  ]);

  const teamData = team[0] || {
    total: 0,
    newThisMonth: 0
  };

  // Calculate personal PV (from orders)
  const personalPV = await Order.aggregate([
    { $match: { user: userId, status: 'delivered' } },
    {
      $group: {
        _id: null,
        total: { $sum: '$totalAmount' },
        thisMonth: {
          $sum: {
            $cond: [
              { $gte: ['$createdAt', startOfMonth] },
              '$totalAmount',
              0
            ]
          }
        }
      }
    }
  ]);

  const personalPVData = personalPV[0] || {
    total: 0,
    thisMonth: 0
  };

  // Get user's rank information
  const userRank = await UserRank.findOne({ user: userId })
    .populate('currentRank')
    .populate('rankHistory.rank');
  
  // Get next rank if current rank exists
  let nextRank = null;
  if (userRank?.currentRank) {
    nextRank = await Rank.findOne({ level: { $gt: userRank.currentRank.level } })
      .sort({ level: 1 })
      .limit(1);
  }
  
  // Calculate team PV (from downline orders)
  const teamPV = await Order.aggregate([
    { 
      $match: { 
        user: { $in: userRank?.progress?.teamSize ? await User.find({ uplineId: userId }).select('_id').lean() : [] },
        status: 'delivered' 
      } 
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$totalAmount' },
        thisMonth: {
          $sum: {
            $cond: [
              { $gte: ['$createdAt', startOfMonth] },
              '$totalAmount',
              0
            ]
          }
        }
      }
    }
  ]);

  const teamPVData = teamPV[0] || {
    total: 0,
    thisMonth: 0
  };
  
  // For now, return basic rank structure
  const rankData = {
    current: {
      name: userRank?.currentRank?.name || 'No Rank',
      benefits: userRank?.currentRank?.benefits || [],
      level: userRank?.currentRank?.level || 0
    },
    next: nextRank ? {
      name: nextRank.name,
      level: nextRank.level,
      requirements: nextRank.requirements
    } : null,
    progress: {
      teamSales: userRank?.progress?.teamSales || 0,
      personalPV: personalPVData.total,
      teamPV: teamPVData.total,
      directReferrals: userRank?.progress?.directReferrals || 0,
      teamSize: userRank?.progress?.teamSize || 0
    }
  };

  res.status(200).json({
    success: true,
    data: {
      earnings: earningsData,
      orders: ordersData,
      team: teamData,
      personalPV: personalPVData,
      rank: rankData
    }
  });
});