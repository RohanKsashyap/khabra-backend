const mongoose = require('mongoose');

const StockSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  franchise: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Franchise',
    required: true
  },
  currentQuantity: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  minimumThreshold: {
    type: Number,
    required: true,
    min: 0,
    validate: {
      validator: function(value) {
        return value <= this.maximumCapacity;
      },
      message: 'Minimum threshold cannot be greater than maximum capacity'
    }
  },
  maximumCapacity: {
    type: Number,
    required: true,
    min: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'],
    default: 'IN_STOCK'
  }
}, {
  timestamps: true,
  methods: {
    // Method to check if stock is low
    checkStockStatus() {
      if (this.currentQuantity === 0) {
        this.status = 'OUT_OF_STOCK';
      } else if (this.currentQuantity <= this.minimumThreshold) {
        this.status = 'LOW_STOCK';
      } else {
        this.status = 'IN_STOCK';
      }
      return this.status;
    },

    // Method to validate stock quantity
    validateQuantity(newQuantity) {
      if (newQuantity > this.maximumCapacity) {
        throw new Error('Quantity cannot exceed maximum capacity');
      }
      return true;
    }
  }
});

// Pre-save hook to update status
StockSchema.pre('save', function(next) {
  this.checkStockStatus();
  this.lastUpdated = new Date();
  next();
});

// Create index for efficient querying
StockSchema.index({ product: 1, franchise: 1 }, { unique: true });

module.exports = mongoose.model('Stock', StockSchema); 