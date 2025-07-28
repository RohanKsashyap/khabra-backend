const mongoose = require('mongoose');
const Stock = require('./Stock');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a product name'],
    trim: true,
  },
  description: {
    type: String,
    required: [true, 'Please add a description'],
  },
  price: {
    type: Number,
    required: [true, 'Please add a price'],
    min: [0, 'Price cannot be negative'],
  },
  image: {
    type: String,
    required: [true, 'Please add an image URL'],
  },
  category: {
    type: String,
    required: [true, 'Please add a category'],
    enum: ['health', 'beauty', 'wellness', 'other'],
  },
  stock: {
    type: Number,
    required: [true, 'Please add stock quantity'],
    min: [0, 'Stock cannot be negative'],
    default: 0,
  },
  commission: {
    type: Number,
    required: [true, 'Please add commission percentage'],
    min: [0, 'Commission cannot be negative'],
    max: [100, 'Commission cannot exceed 100%'],
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  ratings: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    review: String,
    date: {
      type: Date,
      default: Date.now,
    },
  }],
  averageRating: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
  methods: {
    /**
     * Check stock availability for a specific franchise
     * @param {string} franchiseId - ID of the franchise
     * @param {number} quantity - Quantity to check
     * @returns {Promise<boolean>} - Whether the requested quantity is available
     */
    async checkStockAvailability(franchiseId, quantity) {
      try {
        if (!franchiseId || !quantity) {
          console.warn('Missing franchiseId or quantity for stock check');
          return false;
        }

        const stock = await Stock.findOne({ 
          product: this._id, 
          franchise: franchiseId 
        });

        if (!stock) {
          console.warn('No stock found for product:', this._id, 'franchise:', franchiseId);
          return false; // No stock found for this product and franchise
        }

        return stock.currentQuantity >= quantity;
      } catch (error) {
        console.error('Error checking stock availability:', error);
        return false;
      }
    },

    /**
     * Get stock information for a specific franchise
     * @param {string} franchiseId - ID of the franchise
     * @returns {Promise<Object|null>} - Stock information or null
     */
    async getStockInfo(franchiseId) {
      try {
        if (!franchiseId) {
          console.warn('Missing franchiseId for stock info');
          return null;
        }

        return await Stock.findOne({ 
          product: this._id, 
          franchise: franchiseId 
        }).select('currentQuantity minimumThreshold maximumCapacity status');
      } catch (error) {
        console.error('Error getting stock info:', error);
        return null;
      }
    },

    /**
     * Get stock information across all franchises
     * @returns {Promise<Array>} - Array of stock information
     */
    async getAllStockInfo() {
      return await Stock.find({ 
        product: this._id 
      }).populate('franchise', 'name');
    }
  }
});

// Calculate average rating before saving
productSchema.pre('save', function(next) {
  if (this.ratings.length > 0) {
    this.averageRating = this.ratings.reduce((acc, item) => acc + item.rating, 0) / this.ratings.length;
  }
  next();
});

// Add a pre-save hook to ensure stock is created for new products
productSchema.pre('save', async function(next) {
  // If this is a new product, create default stock entries for existing franchises
  if (this.isNew) {
    try {
      const Franchise = mongoose.model('Franchise');
      const franchises = await Franchise.find({});

      const stockEntries = franchises.map(franchise => ({
        product: this._id,
        franchise: franchise._id,
        currentQuantity: this.stock || 0, // Use product's stock value
        minimumThreshold: 10,
        maximumCapacity: Math.max(1000, (this.stock || 0) * 2) // Ensure capacity is at least double the initial stock
      }));

      await Stock.insertMany(stockEntries);
    } catch (error) {
      console.error('Error creating default stock entries:', error);
    }
  }
  next();
});

module.exports = mongoose.model('Product', productSchema);