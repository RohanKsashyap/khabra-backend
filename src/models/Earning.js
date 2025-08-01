const mongoose = require('mongoose');

const earningSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    enum: ['direct', 'level', 'mlm_level', 'franchise', 'rank', 'reward', 'withdrawal'],
    required: true
  },
  level: {
    type: Number,
    required: false
  },
  description: {
    type: String,
    required: true
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: false
  },
  franchiseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Franchise',
    required: false
  },
  date: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['pending', 'completed'],
    default: 'pending'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Earning', earningSchema); 