const mongoose = require('mongoose');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Franchise = require('../models/Franchise');
const Stock = require('../models/Stock');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/asyncHandler');

class CartController {
  /**
   * Get user's cart
   */
  getCart = asyncHandler(async (req, res) => {
    const cart = await Cart.findOne({ user: req.user._id })
      .populate('items.product', 'name price image')
      .populate('items.franchise', 'name');

    if (!cart) {
      return res.status(200).json({
        success: true,
        data: { items: [] }
      });
    }

    res.status(200).json({
      success: true,
      data: cart
    });
  });

  /**
   * Add item to cart
   */
  addToCart = asyncHandler(async (req, res) => {
    const { 
      productId, 
      quantity, 
      franchiseId 
    } = req.body;

    console.log('Add to Cart Request:', { 
      productId, 
      quantity, 
      franchiseId,
      userId: req.user._id 
    });

    // Validate input types
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      console.error('Invalid product ID:', productId);
      throw new ErrorResponse('Invalid product ID', 400);
    }

    // If no franchise ID is provided, try to get the user's franchise
    const effectiveFranchiseId = franchiseId || 
      (req.user.franchise ? req.user.franchise.toString() : null);

    if (!effectiveFranchiseId || !mongoose.Types.ObjectId.isValid(effectiveFranchiseId)) {
      console.error('Invalid or missing franchise ID:', {
        providedFranchiseId: franchiseId,
        userFranchise: req.user.franchise,
        effectiveFranchiseId
      });
      throw new ErrorResponse('Invalid or missing franchise ID', 400);
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      console.error('Invalid quantity:', {
        quantity,
        type: typeof quantity,
        isInteger: Number.isInteger(quantity)
      });
      throw new ErrorResponse('Quantity must be a positive integer', 400);
    }

    // Find the product
    const product = await Product.findById(productId);
    if (!product) {
      console.error('Product not found:', {
        productId,
        productType: typeof productId
      });
      throw new ErrorResponse('Product not found', 404);
    }

    // Find the franchise
    const franchise = await Franchise.findById(effectiveFranchiseId);
    if (!franchise) {
      console.error('Franchise not found:', {
        franchiseId: effectiveFranchiseId,
        franchiseType: typeof effectiveFranchiseId
      });
      throw new ErrorResponse('Franchise not found', 404);
    }

    // Check stock availability
    const stockEntry = await Stock.findOne({ 
      product: productId, 
      franchise: effectiveFranchiseId 
    });

    if (!stockEntry) {
      console.error('No stock information found:', { 
        productId, 
        franchiseId: effectiveFranchiseId,
        stockEntrySearch: {
          product: productId,
          franchise: effectiveFranchiseId
        }
      });
      throw new ErrorResponse('No stock information available for this product and franchise', 404);
    }

    // Validate stock availability
    if (stockEntry.currentQuantity < quantity) {
      console.error('Insufficient stock:', { 
        currentQuantity: stockEntry.currentQuantity, 
        requestedQuantity: quantity,
        stockEntryDetails: stockEntry
      });
      throw new ErrorResponse(
        `Insufficient stock. Available quantity: ${stockEntry.currentQuantity}`, 
        400
      );
    }

    // Find or create cart for the user
    let cart = await Cart.findOne({ 
      user: req.user._id, 
      franchise: effectiveFranchiseId 
    });

    if (!cart) {
      cart = new Cart({ 
        user: req.user._id,
        franchise: effectiveFranchiseId,
        items: []
      });
    }

    // Check if product already in cart
    const existingCartItemIndex = cart.items.findIndex(
      item => 
        item.product.toString() === productId && 
        item.franchise.toString() === effectiveFranchiseId
    );

    if (existingCartItemIndex !== -1) {
      // Update quantity, checking total stock availability
      const proposedQuantity = cart.items[existingCartItemIndex].quantity + quantity;
      
      if (proposedQuantity > stockEntry.currentQuantity) {
        console.error('Total requested quantity exceeds stock:', { 
          currentQuantity: stockEntry.currentQuantity, 
          proposedQuantity 
        });
        throw new ErrorResponse(
          `Cannot add more items. Total requested exceeds available stock. Available: ${stockEntry.currentQuantity}`, 
          400
        );
      }

      cart.items[existingCartItemIndex].quantity = proposedQuantity;
    } else {
      // Add new item to cart
      cart.items.push({
        product: productId,
        quantity,
        franchise: effectiveFranchiseId
      });
    }

    // Save cart
    await cart.save();

    // Populate for response
    await cart.populate([
      { path: 'items.product', select: 'name price image' },
      { path: 'items.franchise', select: 'name' }
    ]);

    console.log('Cart updated successfully:', cart);

    res.status(200).json({
      success: true,
      data: cart
    });
  });

  // Update cart item quantity
  updateQuantity = asyncHandler(async (req, res, next) => {
    const { productId, quantity } = req.body;

    // Validate product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    await cart.updateQuantity(productId, quantity);
    
    // Fetch the updated cart
    const updatedCart = await Cart.findOne({ user: req.user._id });
    if (!updatedCart) {
      return res.json({ items: [] });
    }

    res.json({ items: updatedCart.items });
  });

  // Remove item from cart
  removeFromCart = asyncHandler(async (req, res, next) => {
    const { productId } = req.params;

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    // Remove the item from the cart
    cart.items = cart.items.filter(item => 
      item.product.toString() !== productId.toString()
    );

    // If cart is empty, delete it
    if (cart.items.length === 0) {
      await cart.deleteOne();
      return res.json({ items: [] });
    }

    // Save the updated cart
    await cart.save();

    // Fetch the updated cart to ensure we have the latest data
    const updatedCart = await Cart.findOne({ user: req.user._id });
    
    res.json({ 
      message: 'Item removed from cart successfully',
      items: updatedCart ? updatedCart.items : [] 
    });
  });

  // Clear cart
  clearCart = asyncHandler(async (req, res, next) => {
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    await cart.clear();
    res.json({ message: 'Cart cleared successfully' });
  }); 
}

module.exports = new CartController(); 