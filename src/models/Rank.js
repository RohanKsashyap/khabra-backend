const mongoose = require('mongoose');

const rankSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  level: {
    type: Number,
    required: true,
    unique: true
  },
  requirements: {
    directReferrals: {
      type: Number,
      required: true,
      min: 0
    },
    teamSize: {
      type: Number,
      required: true,
      min: 0
    },
    teamSales: {
      type: Number,
      required: true,
      min: 0
    }
  },
  rewards: {
    commission: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    bonus: {
      type: Number,
      required: true,
      min: 0
    }
  },
  benefits: [{
    type: String,
    trim: true
  }],
  icon: {
    type: String,
    trim: true
  },
  color: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Ensure level is unique
rankSchema.index({ level: 1 }, { unique: true });

const Rank = mongoose.model('Rank', rankSchema);

module.exports = Rank; 