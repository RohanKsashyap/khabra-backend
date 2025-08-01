const mongoose = require('mongoose');

const withdrawalRequestSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  amount: {
    type: Number,
    required: [true, 'Please enter a withdrawal amount'],
    min: [1, 'Withdrawal amount must be greater than 0'],
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  paymentMethod: {
    type: String,
    required: [true, 'Please specify a payment method'],
    // Example: 'Bank Transfer', 'PayPal', 'UPI'
  },
  paymentDetails: {
    // Flexible object to store different details based on paymentMethod
    // For 'Bank Transfer': { bankName, accountNumber, ifscCode, accountHolderName }
    // For 'PayPal': { email }
    type: Object,
    required: true,
  },
  adminNotes: {
    // For admins to add notes on rejection or approval
    type: String,
  },
  processedAt: {
    // Timestamp when the request was approved or rejected
    type: Date,
  },
}, {
  timestamps: true, // Adds createdAt and updatedAt
});

const WithdrawalRequest = mongoose.model('WithdrawalRequest', withdrawalRequestSchema);

module.exports = WithdrawalRequest; 