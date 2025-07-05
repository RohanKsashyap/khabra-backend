const mongoose = require('mongoose');

const mlmCommissionConfigSchema = new mongoose.Schema({
  rates: {
    type: [Number],
    required: true,
    default: [0.015, 0.01, 0.005, 0.005, 0.005] // 1.5%, 1%, 0.5%, 0.5%, 0.5%
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('MLMCommissionConfig', mlmCommissionConfigSchema); 