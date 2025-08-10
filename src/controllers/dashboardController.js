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
const mongoose = require('mongoose');

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
        distributors: {
          $sum: {
            $cond: [{ $eq: ['$role', 'distributor'] }, 1, 0]
          }
        },
        franchiseOwners: {
          $sum: {
            $cond: [{ $eq: ['$role', 'franchise_owner'] }, 1, 0]
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
    distributors: 0,
    franchiseOwners: 0,
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
        distributors: userData.distributors,
        franchiseOwners: userData.franchiseOwners,
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

  // Get recent earnings (last 10)
  const recentEarnings = await Earning.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  res.status(200).json({
    success: true,
    data: {
      earnings: earningsData,
      orders: ordersData,
      team: teamData,
      personalPV: personalPVData,
      rank: rankData,
      recentEarnings: recentEarnings
    }
  });
});

// Get user sales overview with recursive downline tracking (Admin only)
const getUserSalesOverview = asyncHandler(async (req, res) => {
  const userId = req.params.userId;
  const { dateFrom, dateTo, levels = 'all' } = req.query;
  
  if (!userId) {
    return res.status(400).json({
      success: false,
      message: 'User ID is required'
    });
  }

  // Date filtering setup
  let dateFilter = {};
  if (dateFrom || dateTo) {
    dateFilter.createdAt = {};
    if (dateFrom) dateFilter.createdAt.$gte = new Date(dateFrom);
    if (dateTo) dateFilter.createdAt.$lte = new Date(dateTo);
  }

  // Helper function to get all downline users recursively
  const getAllDownlineUsers = async (uplineId, maxLevels = null, currentLevel = 1) => {
    if (maxLevels && currentLevel > maxLevels) return [];
    
    const directDownline = await User.find({ uplineId })
      .select('_id name email role franchise networkLevel uplineId createdAt')
      .lean();
    
    let allDownline = directDownline.map(user => ({ ...user, level: currentLevel }));
    
    // Recursively get downline for each direct member
    for (const user of directDownline) {
      const nestedDownline = await getAllDownlineUsers(user._id, maxLevels, currentLevel + 1);
      allDownline = allDownline.concat(nestedDownline);
    }
    
    return allDownline;
  };

  // Get the target user info
  const targetUser = await User.findById(userId)
    .select('name email role franchiseId networkLevel')
    .populate('franchiseId', 'name')
    .lean();
    
  if (!targetUser) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Get all downline users
  const maxLevels = levels === 'all' ? null : parseInt(levels);
  const downlineUsers = await getAllDownlineUsers(userId, maxLevels);
  const allUserIds = [userId, ...downlineUsers.map(u => u._id)];

  // Get personal sales for target user
  const personalSales = await Order.aggregate([
    { 
      $match: { 
        user: new mongoose.Types.ObjectId(userId),
        ...dateFilter
      } 
    },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalAmount: { $sum: '$totalAmount' },
        totalCommission: { $sum: '$commission.total' },
        avgOrderValue: { $avg: '$totalAmount' },
        statusBreakdown: {
          $push: {
            status: '$status',
            amount: '$totalAmount'
          }
        }
      }
    },
    {
      $addFields: {
        statusSummary: {
          $reduce: {
            input: '$statusBreakdown',
            initialValue: {
              pending: { count: 0, amount: 0 },
              confirmed: { count: 0, amount: 0 },
              delivered: { count: 0, amount: 0 },
              cancelled: { count: 0, amount: 0 }
            },
            in: {
              pending: {
                count: {
                  $cond: [
                    { $eq: ['$$this.status', 'pending'] },
                    { $add: ['$$value.pending.count', 1] },
                    '$$value.pending.count'
                  ]
                },
                amount: {
                  $cond: [
                    { $eq: ['$$this.status', 'pending'] },
                    { $add: ['$$value.pending.amount', '$$this.amount'] },
                    '$$value.pending.amount'
                  ]
                }
              },
              confirmed: {
                count: {
                  $cond: [
                    { $eq: ['$$this.status', 'confirmed'] },
                    { $add: ['$$value.confirmed.count', 1] },
                    '$$value.confirmed.count'
                  ]
                },
                amount: {
                  $cond: [
                    { $eq: ['$$this.status', 'confirmed'] },
                    { $add: ['$$value.confirmed.amount', '$$this.amount'] },
                    '$$value.confirmed.amount'
                  ]
                }
              },
              delivered: {
                count: {
                  $cond: [
                    { $eq: ['$$this.status', 'delivered'] },
                    { $add: ['$$value.delivered.count', 1] },
                    '$$value.delivered.count'
                  ]
                },
                amount: {
                  $cond: [
                    { $eq: ['$$this.status', 'delivered'] },
                    { $add: ['$$value.delivered.amount', '$$this.amount'] },
                    '$$value.delivered.amount'
                  ]
                }
              },
              cancelled: {
                count: {
                  $cond: [
                    { $eq: ['$$this.status', 'cancelled'] },
                    { $add: ['$$value.cancelled.count', 1] },
                    '$$value.cancelled.count'
                  ]
                },
                amount: {
                  $cond: [
                    { $eq: ['$$this.status', 'cancelled'] },
                    { $add: ['$$value.cancelled.amount', '$$this.amount'] },
                    '$$value.cancelled.amount'
                  ]
                }
              }
            }
          }
        }
      }
    }
  ]);

  // Get downline sales summary by level
  const downlineSales = await Order.aggregate([
    { 
      $match: { 
        user: { $in: downlineUsers.map(u => u._id) },
        ...dateFilter
      } 
    },
    {
      $lookup: {
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'userInfo'
      }
    },
    { $unwind: '$userInfo' },
    {
      $group: {
        _id: '$user',
        userName: { $first: '$userInfo.name' },
        userEmail: { $first: '$userInfo.email' },
        totalOrders: { $sum: 1 },
        totalAmount: { $sum: '$totalAmount' },
        totalCommission: { $sum: '$commission.total' }
      }
    }
  ]);

  // Combine downline users with their sales data
  const downlineWithSales = downlineUsers.map(user => {
    const salesData = downlineSales.find(sale => sale._id.toString() === user._id.toString());
    return {
      ...user,
      sales: salesData ? {
        totalOrders: salesData.totalOrders,
        totalAmount: salesData.totalAmount,
        totalCommission: salesData.totalCommission
      } : {
        totalOrders: 0,
        totalAmount: 0,
        totalCommission: 0
      }
    };
  });

  // Get top performers by sales amount
  const topPerformers = downlineWithSales
    .filter(user => user.sales.totalAmount > 0)
    .sort((a, b) => b.sales.totalAmount - a.sales.totalAmount)
    .slice(0, 10);

  // Calculate level-wise summary
  const levelSummary = {};
  downlineWithSales.forEach(user => {
    if (!levelSummary[user.level]) {
      levelSummary[user.level] = {
        userCount: 0,
        totalOrders: 0,
        totalAmount: 0,
        totalCommission: 0
      };
    }
    levelSummary[user.level].userCount += 1;
    levelSummary[user.level].totalOrders += user.sales.totalOrders;
    levelSummary[user.level].totalAmount += user.sales.totalAmount;
    levelSummary[user.level].totalCommission += user.sales.totalCommission;
  });

  // Get total network sales (personal + downline)
  const totalNetworkSales = {
    totalOrders: (personalSales[0]?.totalOrders || 0) + downlineWithSales.reduce((sum, user) => sum + user.sales.totalOrders, 0),
    totalAmount: (personalSales[0]?.totalAmount || 0) + downlineWithSales.reduce((sum, user) => sum + user.sales.totalAmount, 0),
    totalCommission: (personalSales[0]?.totalCommission || 0) + downlineWithSales.reduce((sum, user) => sum + user.sales.totalCommission, 0)
  };

  // Get recent orders from the network
  const recentOrders = await Order.find({
    user: { $in: allUserIds },
    ...dateFilter
  })
  .populate('user', 'name email')
  .populate('franchise', 'name')
  .sort({ createdAt: -1 })
  .limit(20)
  .lean();

  res.status(200).json({
    success: true,
    data: {
      targetUser: {
        ...targetUser,
        personalSales: personalSales[0] || {
          totalOrders: 0,
          totalAmount: 0,
          totalCommission: 0,
          avgOrderValue: 0,
          statusSummary: {
            pending: { count: 0, amount: 0 },
            confirmed: { count: 0, amount: 0 },
            delivered: { count: 0, amount: 0 },
            cancelled: { count: 0, amount: 0 }
          }
        }
      },
      networkSummary: {
        totalNetworkSize: downlineUsers.length,
        maxLevel: Math.max(...downlineUsers.map(u => u.level), 0),
        totalNetworkSales
      },
      levelSummary,
      topPerformers,
      downlineDetails: downlineWithSales,
      recentOrders,
      filters: {
        dateFrom: dateFrom || null,
        dateTo: dateTo || null,
        levels: levels
      }
    }
  });
});

// Export the getUserSalesOverview function
exports.getUserSalesOverview = getUserSalesOverview;
