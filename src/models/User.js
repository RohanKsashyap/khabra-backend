const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name'],
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email',
    ],
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: 6,
    select: false,
  },
  phone: {
    type: String,
    required: [true, 'Please add a phone number'],
  },
  role: {
    type: String,
    enum: ['admin', 'franchise_owner', 'distributor', 'user'],
    default: 'user',
  },
  // MLM and Franchise fields
  franchiseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Franchise',
    default: null
  },
  uplineId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  referralCode: {
    type: String,
    unique: true,
  },
  referredBy: {
    type: String,
    default: null,
  },
  wallet: {
    balance: {
      type: Number,
      default: 0,
    },
    transactions: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
    }],
  },
  network: {
    level1: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    level2: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    level3: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  referralChain: {
    type: [String],
    default: [],
  },
  // Franchise owner specific fields
  franchiseOwner: {
    totalDownline: {
      type: Number,
      default: 0
    },
    totalSales: {
      type: Number,
      default: 0
    },
    commissionEarned: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true,
});

// Encrypt password using bcrypt
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Generate referral code
userSchema.pre('save', async function (next) {
  if (!this.referralCode) {
    this.referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  }
  next();
});

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema); 