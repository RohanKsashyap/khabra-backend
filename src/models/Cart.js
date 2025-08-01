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
    required: false,
    default: null
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
    required: false,
    default: null
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

      // Skip validation if no franchise is set
      if (!this.franchise) {
        return validationErrors;
      }

      for (const item of this.items) {
        const product = await Product.findById(item.product);
        if (!product) {
          validationErrors.push({
            productId: item.product,
            error: 'Product not found'
          });
          continue;
        }

        // Skip stock validation if item doesn't have franchise set
        if (!item.franchise) {
          continue;
        }

        const isAvailable = await product.checkStockAvailability(
          item.franchise, 
          item.quantity
        );

        if (!isAvailable) {
          const stockInfo = await product.getStockInfo(item.franchise);
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
      try {
        const validationErrors = await this.validateCartItems();
        
        if (validationErrors.length > 0) {
          console.log('Found validation errors for cart items:', validationErrors);
          
          // Remove items with validation errors
          this.items = this.items.filter(item => 
            !validationErrors.some(error => 
              error.productId.toString() === item.product.toString()
            )
          );

          await this.save();
        }
      } catch (error) {
        console.error('Error removing out of stock items:', error);
        // Don't throw error, just log it to prevent cart fetching from failing
      }
    }
  }
});

// Pre-save hook to validate cart items
CartSchema.pre('save', async function(next) {
  // Only validate franchise consistency if franchise is set
  if (this.franchise) {
    // Ensure all items are from the same franchise
    if (this.items.some(item => !item.franchise || item.franchise.toString() !== this.franchise.toString())) {
      return next(new Error('All cart items must be from the same franchise'));
    }
  }

  next();
});

module.exports = mongoose.model('Cart', CartSchema); 