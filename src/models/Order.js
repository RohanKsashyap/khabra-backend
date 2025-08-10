const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: false
    },
    productName: {
      type: String,
      required: true
    },
    productPrice: {
      type: Number,
      required: true
    },
    productImage: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    pv: {
      type: Number,
      default: 0
    },
    bv: {
      type: Number,
      default: 0
    },
    returnStatus: {
      type: String,
      enum: ['none', 'pending', 'approved', 'rejected', 'completed'],
      default: 'none',
    },
    returnRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ReturnRequest',
    }
  }],
  totalAmount: {
    type: Number,
    required: true
  },
  totalPV: {
    type: Number,
    default: 0
  },
  totalBV: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'returned', 'on the way'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  shippingAddress: {
    fullName: {
      type: String,
      required: true
    },
    addressLine1: {
      type: String,
      required: true
    },
    addressLine2: String,
    city: {
      type: String,
      required: true
    },
    state: {
      type: String,
      required: true
    },
    postalCode: {
      type: String,
      required: true
    },
    country: {
      type: String,
      required: true,
      default: 'India'
    },
    phone: {
      type: String,
      required: true
    }
  },
  billingAddress: {
    fullName: {
      type: String,
      required: true
    },
    addressLine1: {
      type: String,
      required: true
    },
    addressLine2: String,
    city: {
      type: String,
      required: true
    },
    state: {
      type: String,
      required: true
    },
    postalCode: {
      type: String,
      required: true
    },
    country: {
      type: String,
      required: true,
      default: 'India'
    },
    phone: {
      type: String,
      required: true
    }
  },
  paymentMethod: {
    type: String,
    enum: ['card', 'upi', 'netbanking', 'cod', 'razorpay'],
    required: true
  },
  franchise: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Franchise',
    required: false
  },
  paymentDetails: {
    type: mongoose.Schema.Types.Mixed
  },
  tracking: {
    number: String,
    carrier: String,
    status: {
      type: String,
      enum: ['pending', 'in_transit', 'out_for_delivery', 'delivered', 'failed'],
      default: 'pending'
    },
    estimatedDelivery: Date,
    updates: [{
      status: {
        type: String,
        required: true
      },
      location: String,
      timestamp: {
        type: Date,
        default: Date.now
      },
      description: String
    }]
  },
  deliveryNotes: String,
  orderType: {
    type: String,
    enum: ['online', 'offline'],
    default: 'online'
  },
  guestName: {
    type: String,
    required: false
  },
  guestPhone: {
    type: String,
    required: false
  },
  // Commission tracking (Self + MLM + Franchise)
  commissions: {
    self: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
      },
      productName: {
        type: String,
        required: true
      },
      amount: {
        type: Number,
        required: true
      },
      percentage: {
        type: Number,
        required: true
      },
      status: {
        type: String,
        enum: ['pending', 'paid'],
        default: 'pending'
      },
      paidAt: Date,
      earningId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Earning'
      }
    }],
    mlm: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      level: {
        type: Number,
        required: true
      },
      amount: {
        type: Number,
        required: true
      },
      status: {
        type: String,
        enum: ['pending', 'paid'],
        default: 'pending'
      },
      paidAt: Date,
      earningId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Earning'
      }
    }],
    franchise: {
      franchiseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Franchise'
      },
      amount: {
        type: Number,
        default: 0
      },
      percentage: {
        type: Number,
        default: 0
      },
      status: {
        type: String,
        enum: ['pending', 'paid'],
        default: 'pending'
      },
      paidAt: Date,
      earningId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Earning'
      }
    }
  },
  // Order metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  notes: String
}, {
  timestamps: true
});

// Indexes
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ franchise: 1 });
orderSchema.index({ orderType: 1 });
orderSchema.index({ 'tracking.number': 1 });
orderSchema.index({ createdAt: 1 });

const Order = mongoose.model('Order', orderSchema);

module.exports = Order; 