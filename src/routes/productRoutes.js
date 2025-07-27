const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { protect } = require('../middleware/authMiddleware');

// Get all products
router.get('/', productController.getAllProducts);

// Get single product
router.get('/:id', productController.getProductById);

// Get stock information for a product
router.get('/:id/stock', protect, productController.getProductStockInfo);

// Create a new product (admin only)
router.post('/', protect, productController.createProduct);

// Update a product (admin only)
router.put('/:id', protect, productController.updateProduct);

// Delete a product (admin only)
router.delete('/:id', protect, productController.deleteProduct);

module.exports = router; 