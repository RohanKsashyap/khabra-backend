const mongoose = require('mongoose');

const networkSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  upline: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  level: {
    type: Number,
    default: 1
  },
  directReferrals: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active'
    }
  }],
  teamStats: {
    totalMembers: {
      type: Number,
      default: 0
    },
    activeMembers: {
      type: Number,
      default: 0
    },
    totalSales: {
      type: Number,
      default: 0
    },
    monthlySales: {
      type: Number,
      default: 0
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  genealogy: {
    level1: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    level2: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    level3: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    level4: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    level5: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  },
  performance: {
    monthly: [{
      month: {
        type: Date,
        required: true
      },
      sales: {
        type: Number,
        default: 0
      },
      referrals: {
        type: Number,
        default: 0
      },
      earnings: {
        type: Number,
        default: 0
      }
    }],
    yearly: [{
      year: {
        type: Number,
        required: true
      },
      sales: {
        type: Number,
        default: 0
      },
      referrals: {
        type: Number,
        default: 0
      },
      earnings: {
        type: Number,
        default: 0
      }
    }]
  }
}, {
  timestamps: true
});

// Ensure one network record per user
networkSchema.index({ user: 1 }, { unique: true });

// Index for efficient genealogy queries
networkSchema.index({ 'genealogy.level1': 1 });
networkSchema.index({ 'genealogy.level2': 1 });
networkSchema.index({ 'genealogy.level3': 1 });
networkSchema.index({ 'genealogy.level4': 1 });
networkSchema.index({ 'genealogy.level5': 1 });

const Network = mongoose.model('Network', networkSchema);

module.exports = Network; 