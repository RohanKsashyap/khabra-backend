const Review = require('../models/Review');
const Order = require('../models/Order');
const { validateReview } = require('../utils/validators');

// Get reviews for a product
exports.getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 10, sort = '-createdAt' } = req.query;

    const reviews = await Review.find({ 
      product: productId,
    })
    .populate('user', 'name')
    .sort(sort)
    .limit(limit * 1)
    .skip((page - 1) * limit);

    const count = await Review.countDocuments({ 
      product: productId,
    });

    res.json({
      reviews,
      totalPages: Math.ceil(count / limit),
      currentPage: page
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching reviews', error: error.message });
  }
};

// Add a review
exports.addReview = async (req, res) => {
  try {
    const { error } = validateReview(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { productId, orderId, rating, review, images } = req.body;

    // For admins, skip purchase verification
    if (req.user.role === 'admin') {
      const newReview = new Review({
        user: req.user._id,
        product: productId,
        order: orderId,
        rating,
        review,
        images,
        isVerifiedPurchase: false,
        status: 'approved' // Auto-approve admin reviews
      });

      await newReview.save();
      return res.status(201).json(newReview);
    }

    // For regular users, verify purchase
    const order = await Order.findOne({
      _id: orderId,
      user: req.user._id,
      'items.product': productId,
      status: 'delivered'
    });

    if (!order) {
      return res.status(400).json({ 
        message: 'You can only review products you have purchased and received'
      });
    }

    // Check if review already exists
    const existingReview = await Review.findOne({
      user: req.user._id,
      product: productId,
      order: orderId
    });

    if (existingReview) {
      return res.status(400).json({ 
        message: 'You have already reviewed this product for this order'
      });
    }

    const newReview = new Review({
      user: req.user._id,
      product: productId,
      order: orderId,
      rating,
      review,
      images,
      isVerifiedPurchase: true,
      status: 'pending' // Regular user reviews need approval
    });

    await newReview.save();
    res.status(201).json(newReview);
  } catch (error) {
    res.status(500).json({ message: 'Error adding review', error: error.message });
  }
};

// Update a review
exports.updateReview = async (req, res) => {
  try {
    const { error } = validateReview(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { rating, review, images, status } = req.body; // Added status for admin update

    let reviewDoc;

    // Admins can update any review, regular users can only update their own
    if (req.user.role === 'admin') {
      reviewDoc = await Review.findById(req.params.id);
      if (!reviewDoc) {
        return res.status(404).json({ message: 'Review not found' });
      }

      // Update fields if provided
      if (rating !== undefined) reviewDoc.rating = rating;
      if (review !== undefined) reviewDoc.review = review;
      if (images !== undefined) reviewDoc.images = images;
      if (status !== undefined) reviewDoc.status = status; // Admin can update status

      await reviewDoc.save();
    } else {
      reviewDoc = await Review.findOneAndUpdate(
        { _id: req.params.id, user: req.user._id },
        { 
          rating,
          review,
          images,
          status: 'pending' // Regular user reviews always go to pending after edit
        },
        { new: true }
      );
    }

    if (!reviewDoc) {
      return res.status(404).json({ message: 'Review not found or unauthorized' });
    }

    res.json(reviewDoc);
  } catch (error) {
    res.status(500).json({ message: 'Error updating review', error: error.message });
  }
};

// Delete a review
exports.deleteReview = async (req, res) => {
  try {
    let reviewDoc;

    // Admins can delete any review, regular users can only delete their own
    if (req.user.role === 'admin') {
      reviewDoc = await Review.findByIdAndDelete(req.params.id);
    } else {
      reviewDoc = await Review.findOneAndDelete({
        _id: req.params.id,
        user: req.user._id
      });
    }

    if (!reviewDoc) {
      return res.status(404).json({ message: 'Review not found or unauthorized' });
    }

    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting review', error: error.message });
  }
};

// Like/Unlike a review
exports.toggleLike = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    const likeIndex = review.likes.indexOf(req.user._id);
    if (likeIndex === -1) {
      review.likes.push(req.user._id);
    } else {
      review.likes.splice(likeIndex, 1);
    }

    await review.save();
    res.json(review);
  } catch (error) {
    res.status(500).json({ message: 'Error toggling like', error: error.message });
  }
};

// Admin: Get all reviews
exports.getAllReviews = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const query = status ? { status } : {};

    const reviews = await Review.find(query)
      .populate('user', 'name')
      .populate('product', 'name')
      .sort('-createdAt')
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Review.countDocuments(query);

    res.json({
      reviews,
      totalPages: Math.ceil(count / limit),
      currentPage: page
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching reviews', error: error.message });
  }
};

// Admin: Update review status
exports.updateReviewStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    res.json(review);
  } catch (error) {
    res.status(500).json({ message: 'Error updating review status', error: error.message });
  }
}; 