const Rank = require('../models/Rank');
const UserRank = require('../models/UserRank');
const Order = require('../models/Order');
const User = require('../models/User');
const Network = require('../models/Network');
const MLMCommissionConfig = require('../models/MLMCommissionConfig');

// Get all ranks
exports.getRanks = async (req, res) => {
  try {
    const ranks = await Rank.find().sort({ level: 1 });
    res.json(ranks);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching ranks', error: error.message });
  }
};

// Get a single rank
exports.getRank = async (req, res) => {
  try {
    const rank = await Rank.findById(req.params.id);
    if (!rank) {
      return res.status(404).json({ message: 'Rank not found' });
    }
    res.json(rank);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching rank', error: error.message });
  }
};

// Create a new rank (Admin only)
exports.createRank = async (req, res) => {
  try {
    const rank = new Rank(req.body);
    await rank.save();
    res.status(201).json(rank);
  } catch (error) {
    res.status(400).json({ message: 'Error creating rank', error: error.message });
  }
};

// Update a rank (Admin only)
exports.updateRank = async (req, res) => {
  try {
    const rank = await Rank.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!rank) {
      return res.status(404).json({ message: 'Rank not found' });
    }
    res.json(rank);
  } catch (error) {
    res.status(400).json({ message: 'Error updating rank', error: error.message });
  }
};

// Delete a rank (Admin only)
exports.deleteRank = async (req, res) => {
  try {
    const rank = await Rank.findByIdAndDelete(req.params.id);
    if (!rank) {
      return res.status(404).json({ message: 'Rank not found' });
    }
    res.json({ message: 'Rank deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting rank', error: error.message });
  }
};

// Get user's current rank and progress
exports.getUserRank = async (req, res) => {
  try {
    let userRank = await UserRank.findOne({ user: req.user._id })
      .populate('currentRank')
      .populate('rankHistory.rank');

    if (!userRank) {
      // If user doesn't have a rank record, create one with the lowest rank
      const lowestRank = await Rank.findOne().sort({ level: 1 });
      if (!lowestRank) {
        return res.status(404).json({ message: 'No ranks found in the system' });
      }

      userRank = new UserRank({
        user: req.user._id,
        currentRank: lowestRank._id,
        rankHistory: [{
          rank: lowestRank._id,
          achievedAt: new Date()
        }]
      });
      await userRank.save();
    }

    // Get next rank if available
    const nextRank = await Rank.findOne({ level: userRank.currentRank.level + 1 });
    
    res.json({
      currentRank: userRank.currentRank,
      nextRank,
      progress: userRank.progress,
      achievements: userRank.achievements,
      rankHistory: userRank.rankHistory,
      personalPV: userRank.progress.personalPV || 0,
      teamPV: userRank.progress.teamPV || 0
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user rank', error: error.message });
  }
};

// Update user's rank progress
exports.updateUserRankProgress = async (req, res) => {
  try {
    // Time window: current month
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Helper to get personal PV in time window
    const getPersonalPV = async (userId) => {
      const orders = await Order.find({
        user: userId,
        createdAt: { $gte: firstDayOfMonth, $lte: now },
        status: { $in: ['processing', 'shipped', 'delivered'] },
      });
      return orders.reduce((sum, order) => sum + (order.totalPV || 0), 0);
    };

    // Helper to get all downline user IDs recursively
    const getDownlineUserIds = async (userId) => {
      const user = await User.findById(userId);
      if (!user || !user.referralCode) return [];
      const directDownlines = await User.find({ referredBy: user.referralCode });
      let all = [];
      for (const downline of directDownlines) {
        all.push(downline._id);
        const subDownlines = await getDownlineUserIds(downline._id);
        all = all.concat(subDownlines);
      }
      return all;
    };

    // Calculate user's own PV
    const userId = req.user._id;
    const personalPV = await getPersonalPV(userId);

    // Calculate downline PV
    const downlineUserIds = await getDownlineUserIds(userId);
    let downlinePV = 0;
    for (const downlineId of downlineUserIds) {
      downlinePV += await getPersonalPV(downlineId);
    }
    const totalTeamPV = personalPV + downlinePV;

    // Update progress in UserRank
    const userRank = await UserRank.findOne({ user: userId }).populate('currentRank');
    if (!userRank) {
      return res.status(404).json({ message: 'User rank not found' });
    }
    userRank.progress = {
      ...userRank.progress,
      personalPV,
      teamPV: totalTeamPV,
    };

    // Check for rank up (assume requirements.personalPV and requirements.teamPV in Rank model)
    const nextRank = await Rank.findOne({ level: userRank.currentRank.level + 1 });
    if (nextRank) {
      const canRankUp =
        personalPV >= (nextRank.requirements.personalPV || 0) &&
        totalTeamPV >= (nextRank.requirements.teamPV || 0);
      if (canRankUp) {
        userRank.currentRank = nextRank._id;
        userRank.rankHistory.push({
          rank: nextRank._id,
          achievedAt: new Date(),
        });
        userRank.achievements.push({
          name: `Reached ${nextRank.name} Rank`,
          description: `Successfully achieved ${nextRank.name} rank`,
          date: new Date(),
          reward: nextRank.rewards.bonus,
          type: 'rank_up',
        });
      }
    }
    await userRank.save();
    res.json(userRank);
  } catch (error) {
    res.status(500).json({ message: 'Error updating user rank progress', error: error.message });
  }
};

// Add achievement to user's rank
exports.addAchievement = async (req, res) => {
  try {
    const { name, description, reward, type } = req.body;
    
    const userRank = await UserRank.findOne({ user: req.user._id });
    if (!userRank) {
      return res.status(404).json({ message: 'User rank not found' });
    }

    userRank.achievements.push({
      name,
      description,
      date: new Date(),
      reward,
      type
    });

    await userRank.save();
    res.json(userRank);
  } catch (error) {
    res.status(500).json({ message: 'Error adding achievement', error: error.message });
  }
};

// Get current MLM commission rates
exports.getCommissionRates = async (req, res) => {
  try {
    let config = await MLMCommissionConfig.findOne();
    if (!config) {
      config = await MLMCommissionConfig.create({});
    }
    res.json({ rates: config.rates });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch commission rates', error: err.message });
  }
};

// Update MLM commission rates (admin only)
exports.updateCommissionRates = async (req, res) => {
  try {
    const { rates } = req.body;
    if (!Array.isArray(rates) || rates.length !== 5) {
      return res.status(400).json({ message: 'Rates must be an array of 5 numbers.' });
    }
    let config = await MLMCommissionConfig.findOne();
    if (!config) {
      config = await MLMCommissionConfig.create({ rates, updatedBy: req.user._id });
    } else {
      config.rates = rates;
      config.updatedBy = req.user._id;
      config.updatedAt = new Date();
      await config.save();
    }
    res.json({ message: 'Commission rates updated', rates: config.rates });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update commission rates', error: err.message });
  }
}; 