const mongoose = require('mongoose');

const returnRequestSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  reason: {
    type: String,
    required: [true, 'Return reason is required'],
    trim: true,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'completed'],
    default: 'pending',
  },
  requestDate: {
    type: Date,
    default: Date.now,
  },
  resolutionDate: {
    type: Date,
  },
  adminNotes: {
    type: String,
  },
}, {
  timestamps: true,
});

const ReturnRequest = mongoose.model('ReturnRequest', returnRequestSchema);

module.exports = ReturnRequest; 