const express = require('express');
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct
} = require('../controllers/productController');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

// Apply protect middleware to all routes
router.use(protect);

// Apply admin authorization to all routes
router.use(authorize('admin'));

// Product routes
router.route('/')
  .get(getProducts)
  .post(createProduct);

router.route('/:id')
  .get(getProduct)
  .put(updateProduct)
  .delete(deleteProduct);

module.exports = router; 