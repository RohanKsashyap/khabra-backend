const Product = require('../models/Product');
const Stock = require('../models/Stock');
const asyncHandler = require('../middleware/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

class ProductController {
  /**
   * Get all products with stock information
   */
  getProducts = asyncHandler(async (req, res) => {
    const { 
      franchiseId, 
      category, 
      search, 
      page = 1, 
      limit = 10 
    } = req.query;

    // Build query
    const query = {};
    if (category) query.category = category;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Pagination
    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;

    // Find products
    const products = await Product.find(query)
      .skip(skip)
      .limit(limitNumber)
      .lean(); // Use lean for better performance

    // Attach stock information if franchiseId is provided
    if (franchiseId) {
      const productsWithStock = await Promise.all(
        products.map(async (product) => {
          const stock = await Stock.findOne({ 
            product: product._id, 
            franchise: franchiseId 
          }).select('currentQuantity minimumThreshold maximumCapacity status');

          return {
            ...product,
            stock: stock || {
              currentQuantity: 0,
              minimumThreshold: 0,
              maximumCapacity: 0,
              status: 'OUT_OF_STOCK'
            }
          };
        })
      );

      // Count total products for pagination
      const total = await Product.countDocuments(query);

      res.status(200).json({
        success: true,
        count: productsWithStock.length,
        pagination: {
          currentPage: pageNumber,
          totalPages: Math.ceil(total / limitNumber),
          total
        },
        data: productsWithStock
      });
    } else {
      // If no franchiseId, return products without stock info
      const total = await Product.countDocuments(query);

      res.status(200).json({
        success: true,
        count: products.length,
        pagination: {
          currentPage: pageNumber,
          totalPages: Math.ceil(total / limitNumber),
          total
        },
        data: products
      });
    }
  });

  /**
   * Get single product with stock information
   */
  getProduct = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { franchiseId } = req.query;

    // Find product
    const product = await Product.findById(id);
    if (!product) {
      throw new ErrorResponse('Product not found', 404);
    }

    // If franchiseId is provided, get stock information
    let stockInfo = null;
    if (franchiseId) {
      stockInfo = await Stock.findOne({ 
        product: id, 
        franchise: franchiseId 
      }).select('currentQuantity minimumThreshold maximumCapacity status');
    }

    // Convert product to plain object and add stock info
    const productObject = product.toObject();
    productObject.stock = stockInfo || {
      currentQuantity: 0,
      minimumThreshold: 0,
      maximumCapacity: 0,
      status: 'OUT_OF_STOCK'
    };

    res.status(200).json({
      success: true,
      data: productObject
    });
  });

  /**
   * Create new product
   */
  createProduct = asyncHandler(async (req, res) => {
    const product = await Product.create(req.body);

    res.status(201).json({
      success: true,
      data: product,
    });
  });

  /**
   * Update product
   */
  updateProduct = asyncHandler(async (req, res) => {
    let product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: product,
    });
  });

  /**
   * Delete product
   */
  deleteProduct = asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    await product.remove();

    res.status(200).json({
      success: true,
      data: {},
    });
  });

  /**
   * Add product review
   */
  addProductReview = asyncHandler(async (req, res) => {
    const { rating, review } = req.body;

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Check if user already reviewed
    const alreadyReviewed = product.ratings.find(
      (r) => r.user.toString() === req.user.id
    );

    if (alreadyReviewed) {
      return res.status(400).json({
        success: false,
        message: 'Product already reviewed',
      });
    }

    const newReview = {
      user: req.user.id,
      rating: Number(rating),
      review,
    };

    product.ratings.push(newReview);
    await product.save();

    res.status(201).json({
      success: true,
      message: 'Review added',
    });
  });
}

module.exports = new ProductController(); 