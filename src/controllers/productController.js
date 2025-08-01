const Product = require('../models/Product');
const Stock = require('../models/Stock');
const Franchise = require('../models/Franchise');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/asyncHandler');

class ProductController {
  // Get all products
  getAllProducts = asyncHandler(async (req, res) => {
    const products = await Product.find({});
    res.status(200).json({
      success: true,
      data: products
    });
  });

  // Get single product by ID
  getProductById = asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    res.status(200).json({
      success: true,
      data: product
    });
  });

  // Get stock information for a product
  getProductStockInfo = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { franchiseId } = req.query;

    console.log('Stock Info Request:', { 
      productId: id, 
      franchiseId, 
      userId: req.user._id,
      userRole: req.user.role
    });

    // Find the product
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    // If user is admin, return product-level stock information
    if (req.user.role === 'admin') {
      return res.status(200).json({
        success: true,
        data: {
          available: product.stock > 0,
          currentQuantity: product.stock,
          status: product.stock > 0 ? (product.stock <= 10 ? 'LOW_STOCK' : 'IN_STOCK') : 'OUT_OF_STOCK',
          isAdminView: true
        }
      });
    }

    // For franchise owners, get franchise-specific stock
    const effectiveFranchiseId = franchiseId || 
      (req.user.franchise ? req.user.franchise.toString() : null);

    if (!effectiveFranchiseId) {
      console.error('No franchise ID provided or found for user');
      return res.status(400).json({
        success: false,
        error: 'No franchise ID provided or found for user'
      });
    }

    // Validate franchise
    const franchise = await Franchise.findById(effectiveFranchiseId);
    if (!franchise) {
      console.error('Franchise not found:', effectiveFranchiseId);
      return res.status(404).json({
        success: false,
        error: 'Franchise not found'
      });
    }

    // Find stock information
    const stock = await Stock.findOne({ 
      product: id, 
      franchise: effectiveFranchiseId 
    });

    if (!stock) {
      console.error('No stock information found:', { 
        productId: id, 
        franchiseId: effectiveFranchiseId 
      });
      return res.status(404).json({
        success: false,
        error: 'No stock information available for this product and franchise'
      });
    }

    console.log('Stock Info Retrieved:', stock);

    res.status(200).json({
      success: true,
      data: {
        productId: id,
        currentQuantity: stock.currentQuantity,
        minimumThreshold: stock.minimumThreshold,
        maximumCapacity: stock.maximumCapacity,
        status: stock.status
      }
    });
  });

  // Create a new product
  createProduct = asyncHandler(async (req, res) => {
    const product = await Product.create(req.body);
    res.status(201).json({
      success: true,
      data: product
    });
  });

  // Update a product
  updateProduct = asyncHandler(async (req, res) => {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    res.status(200).json({
      success: true,
      data: product
    });
  });

  // Delete a product
  deleteProduct = asyncHandler(async (req, res) => {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {}
    });
  });
}

module.exports = new ProductController(); 