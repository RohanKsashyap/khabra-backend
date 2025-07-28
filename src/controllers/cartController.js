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

    // Note: cart.franchise can be null if user hasn't selected a franchise yet
    // This is now acceptable behavior

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
    
    // If no franchise ID provided, try to get from user (only if user has franchiseId)
    if (!targetFranchiseId && req.user.franchiseId) {
      targetFranchiseId = req.user.franchiseId;
    }
    
    // Debug logging
    console.log('User franchiseId:', req.user.franchiseId);
    console.log('Request franchiseId:', franchiseId);
    console.log('Target franchiseId:', targetFranchiseId);

    // Verify product exists
    const product = await Product.findById(productId);
    if (!product) {
      return next(new ErrorResponse('Product not found', 404));
    }

    // If franchise ID is provided, verify it exists and check stock
    if (targetFranchiseId) {
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
      // Handle different scenarios based on franchise availability
      const cartHasFranchise = cart.franchise != null;
      const requestHasFranchise = targetFranchiseId != null;
      
      // Scenario 1: Cart has no franchise, request has no franchise - just add item
      if (!cartHasFranchise && !requestHasFranchise) {
        // Check if product already exists in cart
        const existingItemIndex = cart.items.findIndex(
          item => item.product.toString() === productId.toString()
        );
        
        if (existingItemIndex > -1) {
          cart.items[existingItemIndex].quantity += quantity;
        } else {
          cart.items.push({
            product: productId,
            franchise: null,
            quantity: quantity
          });
        }
      }
      // Scenario 2: Cart has no franchise, request has franchise - set franchise and add
      else if (!cartHasFranchise && requestHasFranchise) {
        cart.franchise = targetFranchiseId;
        cart.items.push({
          product: productId,
          franchise: targetFranchiseId,
          quantity: quantity
        });
      }
      // Scenario 3: Cart has franchise, request has no franchise - use cart's franchise
      else if (cartHasFranchise && !requestHasFranchise) {
        // Use the cart's existing franchise for stock validation
        const isAvailable = await product.checkStockAvailability(cart.franchise.toString(), quantity);
        if (!isAvailable) {
          const stockInfo = await product.getStockInfo(cart.franchise.toString());
          return next(new ErrorResponse(
            `Insufficient stock. Available: ${stockInfo ? stockInfo.currentQuantity : 0}`, 
            400
          ));
        }
        
        // Check if product already exists in cart
        const existingItemIndex = cart.items.findIndex(
          item => item.product.toString() === productId.toString()
        );
        
        if (existingItemIndex > -1) {
          const newQuantity = cart.items[existingItemIndex].quantity + quantity;
          
          // Check if new quantity is available
          const isNewQuantityAvailable = await product.checkStockAvailability(cart.franchise.toString(), newQuantity);
          if (!isNewQuantityAvailable) {
            const stockInfo = await product.getStockInfo(cart.franchise.toString());
            return next(new ErrorResponse(
              `Cannot add ${quantity} more. Maximum available: ${stockInfo ? stockInfo.currentQuantity : 0}`, 
              400
            ));
          }
          
          cart.items[existingItemIndex].quantity = newQuantity;
        } else {
          cart.items.push({
            product: productId,
            franchise: cart.franchise, // Use cart's existing franchise
            quantity: quantity
          });
        }
      }
      // Scenario 4: Both have franchise - check if same or different
      else if (cartHasFranchise && requestHasFranchise) {
        if (cart.franchise.toString() !== targetFranchiseId.toString()) {
          // Different franchises - clear cart and switch
          cart.items.splice(0, cart.items.length);
          cart.franchise = targetFranchiseId;
          cart.items.push({
            product: productId,
            franchise: targetFranchiseId,
            quantity: quantity
          });
        } else {
          // Same franchise - check if product exists
          const existingItemIndex = cart.items.findIndex(
            item => item.product.toString() === productId.toString()
          );
          
          if (existingItemIndex > -1) {
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
            cart.items.push({
              product: productId,
              franchise: targetFranchiseId,
              quantity: quantity
            });
          }
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

    // Check stock availability for new quantity (only if franchise is set)
    const product = await Product.findById(productId);
    if (cart.franchise) {
      const isAvailable = await product.checkStockAvailability(cart.franchise.toString(), quantity);
      
      if (!isAvailable) {
        const stockInfo = await product.getStockInfo(cart.franchise.toString());
        return next(new ErrorResponse(
          `Insufficient stock. Available: ${stockInfo ? stockInfo.currentQuantity : 0}`,
          400
        ));
      }
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
    cart.franchise = null; // Also clear the franchise
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

// @desc    Clear cart franchise
// @route   DELETE /api/cart/clear-franchise
// @access  Private
exports.clearCartFranchise = asyncHandler(async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      return next(new ErrorResponse('Cart not found', 404));
    }

    // Clear franchise from cart and all items
    cart.franchise = null;
    cart.items.forEach(item => {
      item.franchise = null;
    });
    
    await cart.save();

    // Populate cart for response
    await cart.populate({
      path: 'items.product',
      select: 'name price image category commission stock'
    });

    res.status(200).json({
      success: true,
      message: 'Cart franchise cleared successfully',
      data: cart
    });

  } catch (error) {
    console.error('Clear cart franchise error:', error);
    return next(new ErrorResponse('Failed to clear cart franchise', 500));
  }
});
