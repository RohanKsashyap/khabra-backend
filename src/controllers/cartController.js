const asyncHandler = require('../middleware/asyncHandler');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Franchise = require('../models/Franchise');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get user's cart
// @route   GET /api/cart
// @access  Private
exports.getCart = asyncHandler(async (req, res, next) => {
  try {
    let cart = await Cart.findOne({ user: req.user.id })
      .populate({
        path: 'items.product',
        select: 'name price image category commission stock'
      })
      .populate({
        path: 'franchise',
        select: 'name location'
      });

    if (!cart) {
      console.warn('No cart found for user:', req.user.id);
      // If no cart exists, return empty cart
      return res.status(200).json({
        success: true,
        data: {
          items: [],
          franchise: null
        }
      });
    }

    // Check if cart has required franchise reference
    if (cart && !cart.franchise) {
      console.error('Cart found but missing franchise reference for user:', req.user.id);
      // Delete corrupted cart and return empty cart
      await Cart.deleteOne({ user: req.user.id });
      return res.status(200).json({
        success: true,
        data: {
          items: [],
          franchise: null
        }
      });
    }

    // Validate cart items and remove out of stock items
    await cart.removeOutOfStockItems();

    res.status(200).json({
      success: true,
      data: cart
    });
  } catch (error) {
    if (error.name === 'CastError') {
      console.error('Invalid ID format:', error);
    } else {
      console.error('Unexpected get cart error:', error);
    }
    return next(new ErrorResponse('Failed to fetch cart', 500));
  }
});

// @desc    Add item to cart
// @route   POST /api/cart/add
// @access  Private
exports.addToCart = asyncHandler(async (req, res, next) => {
  try {
    const { productId, quantity = 1, franchiseId } = req.body;

    if (!productId) {
      return next(new ErrorResponse('Product ID is required', 400));
    }

    // Determine franchise ID
    let targetFranchiseId = franchiseId;
    
    // If no franchise ID provided, try to get from user
    if (!targetFranchiseId) {
      if (req.user.franchiseId) {
        targetFranchiseId = req.user.franchiseId;
      } else {
        // If user has no franchise, try to find a default franchise or create one
        const defaultFranchise = await Franchise.findOne({ isDefault: true });
        if (defaultFranchise) {
          targetFranchiseId = defaultFranchise._id;
        } else {
          return next(new ErrorResponse('Invalid or missing franchise ID', 400));
        }
      }
    }

    // Verify product exists
    const product = await Product.findById(productId);
    if (!product) {
      return next(new ErrorResponse('Product not found', 404));
    }

    // Verify franchise exists
    const franchise = await Franchise.findById(targetFranchiseId);
    if (!franchise) {
      return next(new ErrorResponse('Franchise not found', 404));
    }

    // Check stock availability
    const isAvailable = await product.checkStockAvailability(targetFranchiseId, quantity);
    if (!isAvailable) {
      const stockInfo = await product.getStockInfo(targetFranchiseId);
      return next(new ErrorResponse(
        `Insufficient stock. Available: ${stockInfo ? stockInfo.currentQuantity : 0}`, 
        400
      ));
    }

    // Find or create cart
    let cart = await Cart.findOne({ user: req.user.id });

    if (!cart) {
      // Create new cart
      cart = new Cart({
        user: req.user.id,
        franchise: targetFranchiseId,
        items: [{
          product: productId,
          franchise: targetFranchiseId,
          quantity: quantity
        }]
      });
    } else {
      // Check if cart is for the same franchise
      if (cart.franchise.toString() !== targetFranchiseId.toString()) {
        // Clear cart if switching franchises
        cart.franchise = targetFranchiseId;
        cart.items.splice(0, cart.items.length); // Clear existing items
        cart.items.push({
          product: productId,
          franchise: targetFranchiseId,
          quantity: quantity
        });
      } else {
        // Check if product already exists in cart
        const existingItemIndex = cart.items.findIndex(
          item => item.product.toString() === productId.toString()
        );

        if (existingItemIndex > -1) {
          // Update quantity
          const newQuantity = cart.items[existingItemIndex].quantity + quantity;
          
          // Check if new quantity is available
          const isNewQuantityAvailable = await product.checkStockAvailability(targetFranchiseId, newQuantity);
          if (!isNewQuantityAvailable) {
            const stockInfo = await product.getStockInfo(targetFranchiseId);
            return next(new ErrorResponse(
              `Cannot add ${quantity} more. Maximum available: ${stockInfo ? stockInfo.currentQuantity : 0}`, 
              400
            ));
          }
          
          cart.items[existingItemIndex].quantity = newQuantity;
        } else {
          // Add new item
          cart.items.push({
            product: productId,
            franchise: targetFranchiseId,
            quantity: quantity
          });
        }
      }
    }

    await cart.save();

    // Populate cart for response
    await cart.populate({
      path: 'items.product',
      select: 'name price image category commission stock'
    });

    res.status(200).json({
      success: true,
      message: 'Item added to cart successfully',
      data: cart
    });

  } catch (error) {
    console.error('Add to cart error:', error);
    return next(new ErrorResponse('Failed to add item to cart', 500));
  }
});

// @desc    Update item quantity in cart
// @route   PUT /api/cart/update
// @access  Private
exports.updateQuantity = asyncHandler(async (req, res, next) => {
  try {
    const { productId, quantity } = req.body;

    if (!productId || !quantity || quantity < 1) {
      return next(new ErrorResponse('Product ID and valid quantity are required', 400));
    }

    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      return next(new ErrorResponse('Cart not found', 404));
    }

    const itemIndex = cart.items.findIndex(
      item => item.product.toString() === productId.toString()
    );

    if (itemIndex === -1) {
      return next(new ErrorResponse('Item not found in cart', 404));
    }

    // Check stock availability for new quantity
    const product = await Product.findById(productId);
    const isAvailable = await product.checkStockAvailability(cart.franchise.toString(), quantity);
    
    if (!isAvailable) {
      const stockInfo = await product.getStockInfo(cart.franchise.toString());
      return next(new ErrorResponse(
        `Insufficient stock. Available: ${stockInfo ? stockInfo.currentQuantity : 0}`,
        400
      ));
    }

    cart.items[itemIndex].quantity = quantity;
    await cart.save();

    // Populate cart for response
    await cart.populate({
      path: 'items.product',
      select: 'name price image category commission stock'
    });

    res.status(200).json({
      success: true,
      message: 'Cart updated successfully',
      data: cart
    });

  } catch (error) {
    console.error('Update cart error:', error);
    return next(new ErrorResponse('Failed to update cart', 500));
  }
});

// @desc    Remove item from cart
// @route   DELETE /api/cart/remove/:productId
// @access  Private
exports.removeFromCart = asyncHandler(async (req, res, next) => {
  try {
    const { productId } = req.params;

    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      return next(new ErrorResponse('Cart not found', 404));
    }

    const filteredItems = cart.items.filter(
      item => item.product.toString() !== productId.toString()
    );
    cart.items.splice(0, cart.items.length, ...filteredItems);

    await cart.save();

    // Populate cart for response
    await cart.populate({
      path: 'items.product',
      select: 'name price image category commission stock'
    });

    res.status(200).json({
      success: true,
      message: 'Item removed from cart successfully',
      data: cart
    });

  } catch (error) {
    console.error('Remove from cart error:', error);
    return next(new ErrorResponse('Failed to remove item from cart', 500));
  }
});

// @desc    Clear cart
// @route   DELETE /api/cart/clear
// @access  Private
exports.clearCart = asyncHandler(async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      return next(new ErrorResponse('Cart not found', 404));
    }

    cart.items.splice(0, cart.items.length);
    await cart.save();

    res.status(200).json({
      success: true,
      message: 'Cart cleared successfully',
      data: cart
    });

  } catch (error) {
    console.error('Clear cart error:', error);
    return next(new ErrorResponse('Failed to clear cart', 500));
  }
});