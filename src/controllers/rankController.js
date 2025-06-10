const Rank = require('../models/Rank');
const UserRank = require('../models/UserRank');

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
      rankHistory: userRank.rankHistory
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user rank', error: error.message });
  }
};

// Update user's rank progress
exports.updateUserRankProgress = async (req, res) => {
  try {
    const { directReferrals, teamSize, teamSales } = req.body;
    
    const userRank = await UserRank.findOne({ user: req.user._id })
      .populate('currentRank');

    if (!userRank) {
      return res.status(404).json({ message: 'User rank not found' });
    }

    // Update progress
    userRank.progress = {
      directReferrals: directReferrals || userRank.progress.directReferrals,
      teamSize: teamSize || userRank.progress.teamSize,
      teamSales: teamSales || userRank.progress.teamSales
    };

    // Check for rank up
    const nextRank = await Rank.findOne({ level: userRank.currentRank.level + 1 });
    if (nextRank) {
      const canRankUp = 
        userRank.progress.directReferrals >= nextRank.requirements.directReferrals &&
        userRank.progress.teamSize >= nextRank.requirements.teamSize &&
        userRank.progress.teamSales >= nextRank.requirements.teamSales;

      if (canRankUp) {
        userRank.currentRank = nextRank._id;
        userRank.rankHistory.push({
          rank: nextRank._id,
          achievedAt: new Date()
        });

        // Add achievement for rank up
        userRank.achievements.push({
          name: `Reached ${nextRank.name} Rank`,
          description: `Successfully achieved ${nextRank.name} rank`,
          date: new Date(),
          reward: nextRank.rewards.bonus,
          type: 'rank_up'
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