const mongoose = require('mongoose');

const userRankSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  currentRank: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Rank',
    required: true
  },
  progress: {
    directReferrals: {
      type: Number,
      default: 0,
      min: 0
    },
    teamSize: {
      type: Number,
      default: 0,
      min: 0
    },
    teamSales: {
      type: Number,
      default: 0,
      min: 0
    },
    personalPV: {
      type: Number,
      default: 0,
      min: 0
    },
    teamPV: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  achievements: [{
    name: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    date: {
      type: Date,
      default: Date.now
    },
    reward: {
      type: Number,
      required: true,
      min: 0
    },
    type: {
      type: String,
      enum: ['rank_up', 'milestone', 'special'],
      required: true
    }
  }],
  rankHistory: [{
    rank: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Rank',
      required: true
    },
    achievedAt: {
      type: Date,
      default: Date.now
    }
  }],
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Ensure one rank record per user
userRankSchema.index({ user: 1 }, { unique: true });

const UserRank = mongoose.model('UserRank', userRankSchema);

module.exports = UserRank; 