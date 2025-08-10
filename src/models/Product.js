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
  imageFileId: {
    type: String,
    // Optional field to store ImageKit fileId for deletion
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Please add a category'],
  },
  stock: {
    type: Number,
    required: [true, 'Please add stock quantity'],
    min: [0, 'Stock cannot be negative'],
    default: 0,
  },
  selfCommission: {
    type: Number,
    required: [true, 'Please add self-commission percentage'],
    min: [0, 'Self-commission cannot be negative'],
    max: [100, 'Self-commission cannot exceed 100%'],
    default: 3,
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
  // SEO Fields
  seoTitle: {
    type: String,
    trim: true,
    maxlength: [60, 'SEO title cannot exceed 60 characters'],
  },
  metaDescription: {
    type: String,
    trim: true,
    maxlength: [160, 'Meta description cannot exceed 160 characters'],
  },
  keywords: [{
    type: String,
    trim: true,
    lowercase: true,
  }],
  slug: {
    type: String,
    trim: true,
    lowercase: true,
    index: true,
  },
  canonicalUrl: {
    type: String,
    trim: true,
  },
  featured: {
    type: Boolean,
    default: false,
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
  }],
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

// Auto-generate SEO fields before saving
productSchema.pre('save', function(next) {
  // Auto-generate slug if not provided
  if (this.isModified('name') && (!this.slug || this.slug === '')) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .trim('-'); // Remove leading/trailing hyphens
  }
  
  // Auto-generate SEO title if not provided
  if (this.isModified('name') && (!this.seoTitle || this.seoTitle === '')) {
    this.seoTitle = `${this.name} - Premium MLM Products | Khabra Generations Care`;
    if (this.seoTitle.length > 60) {
      this.seoTitle = `${this.name} | Khabra Generations Care`;
    }
  }
  
  // Auto-generate meta description if not provided
  if ((this.isModified('name') || this.isModified('description')) && (!this.metaDescription || this.metaDescription === '')) {
    const shortDesc = this.description ? this.description.substring(0, 100) : '';
    this.metaDescription = `Buy ${this.name} - ${shortDesc}. Earn rewards with our trusted MLM business. Premium quality products with government approval.`;
    if (this.metaDescription.length > 160) {
      this.metaDescription = this.metaDescription.substring(0, 157) + '...';
    }
  }
  
  // Auto-generate keywords from name and category
  if (this.isModified('name') && this.keywords.length === 0) {
    const nameWords = this.name.toLowerCase().split(' ').filter(word => word.length > 2);
    this.keywords = [...nameWords, 'mlm products', 'direct selling', 'network marketing', 'india'];
  }
  
  next();
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