const mongoose = require('mongoose');
const Product = require('./Product');
const Stock = require('./Stock');

const CartItemSchema = new mongoose.Schema({
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
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1']
  }
}, { 
  _id: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Add a virtual to get product details
CartItemSchema.virtual('productDetails', {
  ref: 'Product',
  localField: 'product',
  foreignField: '_id',
  justOne: true
});

// Add a virtual to check stock availability
CartItemSchema.virtual('stockAvailable').get(async function() {
  try {
    const product = await Product.findById(this.product);
    return await product.checkStockAvailability(this.franchise, this.quantity);
  } catch (error) {
    console.error('Error checking stock availability:', error);
    return false;
  }
});

const CartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  franchise: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Franchise',
    required: true
  },
  items: [CartItemSchema],
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  methods: {
    /**
     * Validate cart items against current stock
     * @returns {Promise<Array>} - Array of validation errors
     */
    async validateCartItems() {
      const validationErrors = [];

      for (const item of this.items) {
        const product = await Product.findById(item.product);
        if (!product) {
          validationErrors.push({
            productId: item.product,
            error: 'Product not found'
          });
          continue;
        }

        const isAvailable = await product.checkStockAvailability(
          this.franchise, 
          item.quantity
        );

        if (!isAvailable) {
          const stockInfo = await product.getStockInfo(this.franchise);
          validationErrors.push({
            productId: item.product,
            error: `Insufficient stock. Available: ${stockInfo ? stockInfo.currentQuantity : 0}`
          });
        }
      }

      return validationErrors;
    },

    /**
     * Remove items with insufficient stock
     * @returns {Promise<void>}
     */
    async removeOutOfStockItems() {
      const validationErrors = await this.validateCartItems();
      
      // Remove items with validation errors
      this.items = this.items.filter(item => 
        !validationErrors.some(error => 
          error.productId.toString() === item.product.toString()
        )
      );

      await this.save();
    }
  }
});

// Pre-save hook to validate cart items
CartSchema.pre('save', async function(next) {
  // Ensure all items are from the same franchise
  if (this.items.some(item => item.franchise.toString() !== this.franchise.toString())) {
    return next(new Error('All cart items must be from the same franchise'));
  }

  next();
});

module.exports = mongoose.model('Cart', CartSchema); 