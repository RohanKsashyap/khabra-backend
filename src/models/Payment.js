const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'INR'
  },
  paymentMethod: {
    type: String,
    enum: ['card', 'upi', 'netbanking', 'wallet', 'cod', 'razorpay'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'authorized', 'captured', 'failed', 'refunded', 'completed'],
    default: 'pending'
  },
  razorpayOrderId: {
    type: String
  },
  razorpayPaymentId: {
    type: String
  },
  razorpaySignature: {
    type: String
  },
  refundId: {
    type: String
  },
  refundStatus: {
    type: String,
    enum: ['none', 'initiated', 'processed', 'failed'],
    default: 'none'
  },
  refundAmount: {
    type: Number,
    default: 0
  },
  paymentDetails: {
    type: mongoose.Schema.Types.Mixed
  },
  errorDetails: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Indexes
paymentSchema.index({ order: 1 });
paymentSchema.index({ razorpayOrderId: 1 });
paymentSchema.index({ razorpayPaymentId: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ refundStatus: 1 });

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment; 