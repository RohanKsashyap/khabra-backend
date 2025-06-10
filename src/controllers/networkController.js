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
      joinedAt: new Date()
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