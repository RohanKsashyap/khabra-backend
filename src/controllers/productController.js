const Product = require('../models/Product');
const asyncHandler = require('../middleware/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get all products
// @route   GET /api/v1/products
// @access  Private/Admin
exports.getProducts = asyncHandler(async (req, res, next) => {
  const { search, category, page = 1, limit = 12 } = req.query;
  const query = {};
  if (search && typeof search === 'string' && search.trim()) {
    query.name = { $regex: new RegExp(search, 'i') };
  }
  if (category && typeof category === 'string' && category.trim()) {
    query.category = category;
  }
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const products = await Product.find(query).skip(skip).limit(parseInt(limit));
  const total = await Product.countDocuments(query);
  res.status(200).json({
    success: true,
    count: products.length,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit)),
    data: products
  });
});

// @desc    Get single product
// @route   GET /api/v1/products/:id
// @access  Private/Admin
exports.getProduct = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id);
  
  if (!product) {
    return next(new ErrorResponse(`Product not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    data: product
  });
});

// @desc    Create new product
// @route   POST /api/v1/products
// @access  Private/Admin
exports.createProduct = asyncHandler(async (req, res, next) => {
  console.log('Attempting to create product. Request body:', req.body);
  try {
    const product = await Product.create(req.body);
    console.log('Product successfully created:', product);
    res.status(201).json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Error creating product in controller:', error);
    next(error);
  }
});

// @desc    Update product
// @route   PUT /api/v1/products/:id
// @access  Private/Admin
exports.updateProduct = asyncHandler(async (req, res, next) => {
  let product = await Product.findById(req.params.id);

  if (!product) {
    return next(new ErrorResponse(`Product not found with id of ${req.params.id}`, 404));
  }

  product = await Product.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: product
  });
});

// @desc    Delete product
// @route   DELETE /api/v1/products/:id
// @access  Private/Admin
exports.deleteProduct = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return next(new ErrorResponse(`Product not found with id of ${req.params.id}`, 404));
  }

  await product.deleteOne();

  res.status(200).json({
    success: true,
    data: {}
  });
}); 