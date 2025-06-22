const Network = require('../models/Network');
const User = require('../models/User');

// Get user's network
exports.getNetwork = async (req, res) => {
  try {
    const network = await Network.findOne({ user: req.user._id })
      .populate('upline', 'name email')
      .populate('directReferrals.user', 'name email')
      .populate('genealogy.level1', 'name email')
      .populate('genealogy.level2', 'name email')
      .populate('genealogy.level3', 'name email')
      .populate('genealogy.level4', 'name email')
      .populate('genealogy.level5', 'name email');

    if (!network) {
      return res.status(404).json({ message: 'Network not found' });
    }

    res.json(network);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching network', error: error.message });
  }
};

// Add a new referral to user's network
exports.addReferral = async (req, res) => {
  try {
    const { referralId } = req.body;
    
    // Check if referral exists
    const referral = await User.findById(referralId);
    if (!referral) {
      return res.status(404).json({ message: 'Referral user not found' });
    }

    // Get or create network for current user
    let network = await Network.findOne({ user: req.user._id });
    if (!network) {
      network = new Network({ user: req.user._id });
    }

    // Check if referral already exists
    const existingReferral = network.directReferrals.find(
      ref => ref.user.toString() === referralId
    );
    if (existingReferral) {
      return res.status(400).json({ message: 'Referral already exists' });
    }

    // Add referral to direct referrals
    network.directReferrals.push({
      user: referralId,
      joinedAt: new Date(),
      status: 'active',
    });

    // Update team stats
    network.teamStats.totalMembers += 1;
    network.teamStats.activeMembers += 1;

    // Update genealogy
    network.genealogy.level1.push(referralId);

    await network.save();

    // Create or update network for referral
    let referralNetwork = await Network.findOne({ user: referralId });
    if (!referralNetwork) {
      referralNetwork = new Network({
        user: referralId,
        upline: req.user._id,
        level: network.level + 1
      });
    } else {
      referralNetwork.upline = req.user._id;
      referralNetwork.level = network.level + 1;
    }
    await referralNetwork.save();

    res.json(network);
  } catch (error) {
    res.status(500).json({ message: 'Error adding referral', error: error.message });
  }
};

// Update network stats
exports.updateNetworkStats = async (req, res) => {
  try {
    const { totalMembers, activeMembers, totalSales, monthlySales } = req.body;
    
    const network = await Network.findOne({ user: req.user._id });
    if (!network) {
      return res.status(404).json({ message: 'Network not found' });
    }

    network.teamStats = {
      totalMembers: totalMembers || network.teamStats.totalMembers,
      activeMembers: activeMembers || network.teamStats.activeMembers,
      totalSales: totalSales || network.teamStats.totalSales,
      monthlySales: monthlySales || network.teamStats.monthlySales,
      lastUpdated: new Date()
    };

    await network.save();
    res.json(network);
  } catch (error) {
    res.status(500).json({ message: 'Error updating network stats', error: error.message });
  }
};

// Get network performance
exports.getNetworkPerformance = async (req, res) => {
  try {
    const network = await Network.findOne({ user: req.user._id });
    if (!network) {
      return res.status(404).json({ message: 'Network not found' });
    }

    res.json({
      monthly: network.performance.monthly,
      yearly: network.performance.yearly
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching network performance', error: error.message });
  }
};

// Update network performance
exports.updateNetworkPerformance = async (req, res) => {
  try {
    const { month, year, sales, referrals, earnings } = req.body;
    
    const network = await Network.findOne({ user: req.user._id });
    if (!network) {
      return res.status(404).json({ message: 'Network not found' });
    }

    if (month) {
      // Update monthly performance
      const monthIndex = network.performance.monthly.findIndex(
        m => m.month.getMonth() === new Date(month).getMonth() &&
             m.month.getFullYear() === new Date(month).getFullYear()
      );

      if (monthIndex > -1) {
        network.performance.monthly[monthIndex] = {
          month: new Date(month),
          sales: sales || network.performance.monthly[monthIndex].sales,
          referrals: referrals || network.performance.monthly[monthIndex].referrals,
          earnings: earnings || network.performance.monthly[monthIndex].earnings
        };
      } else {
        network.performance.monthly.push({
          month: new Date(month),
          sales: sales || 0,
          referrals: referrals || 0,
          earnings: earnings || 0
        });
      }
    }

    if (year) {
      // Update yearly performance
      const yearIndex = network.performance.yearly.findIndex(
        y => y.year === year
      );

      if (yearIndex > -1) {
        network.performance.yearly[yearIndex] = {
          year,
          sales: sales || network.performance.yearly[yearIndex].sales,
          referrals: referrals || network.performance.yearly[yearIndex].referrals,
          earnings: earnings || network.performance.yearly[yearIndex].earnings
        };
      } else {
        network.performance.yearly.push({
          year,
          sales: sales || 0,
          referrals: referrals || 0,
          earnings: earnings || 0
        });
      }
    }

    await network.save();
    res.json(network);
  } catch (error) {
    res.status(500).json({ message: 'Error updating network performance', error: error.message });
  }
};

// Get user's downline tree up to 5 levels
exports.getNetworkTree = async (req, res) => {
  try {
    let rootUser;
    if (req.params.userId) {
      // Only admin can view any user's tree
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied' });
      }
      rootUser = await User.findById(req.params.userId);
    } else {
      rootUser = await User.findById(req.user._id);
    }

    if (!rootUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    let upline = null;
    // Only fetch upline for admin viewing another user's tree
    if (req.params.userId && rootUser.referredBy) {
      upline = await User.findOne({ referralCode: rootUser.referredBy }).select('name email referralCode role');
    }

    async function buildLevelTree(referralCode, level, maxLevel) {
      if (level > maxLevel) return [];
      const referrals = await User.find({ referredBy: referralCode });
      if (referrals.length === 0) return [];
      
      const tree = [];
      for (const ref of referrals) {
        const downline = await buildLevelTree(ref.referralCode, level + 1, maxLevel);
        
        // Calculate direct referrals count
        const directReferrals = await User.countDocuments({ referredBy: ref.referralCode });
        
        // Calculate total team size (including all levels)
        let teamSize = 0;
        const calculateTeamSize = async (userRefCode) => {
          const children = await User.find({ referredBy: userRefCode });
          teamSize += children.length;
          for (const child of children) {
            await calculateTeamSize(child.referralCode);
          }
        };
        await calculateTeamSize(ref.referralCode);
        
        // Get user's network data for sales information
        const userNetwork = await Network.findOne({ user: ref._id });
        
        tree.push({
          ...ref.toObject(),
          downline,
          directReferrals,
          teamSize,
          totalSales: userNetwork?.teamStats?.totalSales || 0,
          monthlySales: userNetwork?.teamStats?.monthlySales || 0,
          status: 'active', // You can add logic to determine actual status
        });
      }
      return tree;
    }

    const tree = await buildLevelTree(rootUser.referralCode, 1, 5); // 5 levels
    const stats = countLevels(tree);

    // Get root user's network data
    const rootNetwork = await Network.findOne({ user: rootUser._id });
    const rootDirectReferrals = await User.countDocuments({ referredBy: rootUser.referralCode });
    
    // Calculate root user's total team size
    let rootTeamSize = 0;
    const calculateRootTeamSize = async (userRefCode) => {
      const children = await User.find({ referredBy: userRefCode });
      rootTeamSize += children.length;
      for (const child of children) {
        await calculateRootTeamSize(child.referralCode);
      }
    };
    await calculateRootTeamSize(rootUser.referralCode);

    const enhancedRoot = {
      ...rootUser.toObject(),
      directReferrals: rootDirectReferrals,
      teamSize: rootTeamSize,
      totalSales: rootNetwork?.teamStats?.totalSales || 0,
      monthlySales: rootNetwork?.teamStats?.monthlySales || 0,
      status: 'active',
    };

    res.json({
      root: enhancedRoot,
      tree,
      stats,
      upline,
    });
  } catch (error) {
    console.error('Error fetching network tree:', error);
    res.status(500).json({ message: 'Error fetching network tree', error: error.message });
  }
};

function countLevels(tree) {
  let direct = 0;
  let total = 0;
  const levels = {};

  function traverse(nodes, level) {
    if (!nodes || nodes.length === 0) return;
    
    if (level === 1) {
      direct += nodes.length;
    }
    
    if (!levels[level]) {
      levels[level] = 0;
    }
    levels[level] += nodes.length;
    total += nodes.length;

    for (const node of nodes) {
      traverse(node.downline, level + 1);
    }
  }

  traverse(tree, 1);
  return { direct, total, levels };
}

// Get detailed downline analytics for visualizer
exports.getDownlineAnalytics = async (req, res) => {
  try {
    const rootUser = await User.findById(req.user._id);
    if (!rootUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get all downline members up to 5 levels
    const allDownline = [];
    const processedUsers = new Set();

    const collectDownline = async (referralCode, level) => {
      if (level > 5) return;
      
      const referrals = await User.find({ referredBy: referralCode });
      for (const ref of referrals) {
        if (!processedUsers.has(ref._id.toString())) {
          processedUsers.add(ref._id.toString());
          
          // Get user's network data
          const userNetwork = await Network.findOne({ user: ref._id });
          const directReferrals = await User.countDocuments({ referredBy: ref.referralCode });
          
          // Calculate team size
          let teamSize = 0;
          const calculateTeamSize = async (userRefCode) => {
            const children = await User.find({ referredBy: userRefCode });
            teamSize += children.length;
            for (const child of children) {
              await calculateTeamSize(child.referralCode);
            }
          };
          await calculateTeamSize(ref.referralCode);

          allDownline.push({
            _id: ref._id,
            name: ref.name,
            email: ref.email,
            referralCode: ref.referralCode,
            role: ref.role,
            level,
            directReferrals,
            teamSize,
            totalSales: userNetwork?.teamStats?.totalSales || 0,
            monthlySales: userNetwork?.teamStats?.monthlySales || 0,
            createdAt: ref.createdAt,
            status: 'active',
          });

          // Continue collecting downline
          await collectDownline(ref.referralCode, level + 1);
        }
      }
    };

    await collectDownline(rootUser.referralCode, 1);

    // Calculate analytics
    const analytics = {
      totalMembers: allDownline.length,
      activeMembers: allDownline.filter(m => m.status === 'active').length,
      totalSales: allDownline.reduce((sum, m) => sum + m.totalSales, 0),
      monthlySales: allDownline.reduce((sum, m) => sum + m.monthlySales, 0),
      levelDistribution: {},
      topPerformers: allDownline
        .filter(m => m.totalSales > 0)
        .sort((a, b) => b.totalSales - a.totalSales)
        .slice(0, 10),
      rankDistribution: {},
      averageTeamSize: allDownline.length > 0 ? 
        allDownline.reduce((sum, m) => sum + m.teamSize, 0) / allDownline.length : 0,
    };

    // Calculate level distribution
    allDownline.forEach(member => {
      analytics.levelDistribution[member.level] = (analytics.levelDistribution[member.level] || 0) + 1;
    });

    // Calculate rank distribution
    allDownline.forEach(member => {
      analytics.rankDistribution[member.role] = (analytics.rankDistribution[member.role] || 0) + 1;
    });

    res.json({
      success: true,
      data: {
        analytics,
        members: allDownline,
      }
    });
  } catch (error) {
    console.error('Error fetching downline analytics:', error);
    res.status(500).json({ message: 'Error fetching downline analytics', error: error.message });
  }
}; 