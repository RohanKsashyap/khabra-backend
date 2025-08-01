const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  review: {
    type: String,
    required: true,
    trim: true
  },
  images: [{
    type: String,
    trim: true
  }],
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isVerifiedPurchase: {
    type: Boolean,
    default: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  }
}, {
  timestamps: true
});

// Ensure one review per order per product
reviewSchema.index({ user: 1, product: 1, order: 1 }, { unique: true });

// Update product's average rating when a review is created/updated/deleted
reviewSchema.post('save', async function() {
  const Product = mongoose.model('Product');
  const reviews = await this.constructor.find({ product: this.product });
  const averageRating = reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length;
  
  await Product.findByIdAndUpdate(this.product, {
    averageRating: parseFloat(averageRating.toFixed(1))
  });
});

reviewSchema.post('remove', async function() {
  const Product = mongoose.model('Product');
  const reviews = await this.constructor.find({ product: this.product });
  const averageRating = reviews.length > 0 
    ? reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length 
    : 0;
  
  await Product.findByIdAndUpdate(this.product, {
    averageRating: parseFloat(averageRating.toFixed(1))
  });
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review; 