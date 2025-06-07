const Cart = require('../models/Cart');
const Product = require('../models/Product');

// Get user's cart
exports.getCart = async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      cart = await Cart.create({ user: req.user._id, items: [] });
    } else {
      // Update all items with their product details
      for (let item of cart.items) {
        const product = await Product.findById(item.product);
        if (product) {
          item.productName = product.name;
          item.productPrice = product.price;
          item.productImage = product.image;
        }
      }
      await cart.save();
    }

    console.log('Cart items:', cart.items);
    res.json({ items: cart.items });
  } catch (error) {
    console.error('Error getting cart:', error);
    res.status(500).json({ message: error.message });
  }
};

// Add item to cart
exports.addToCart = async (req, res) => {
  try {
    const { productId, quantity } = req.body;

    // Validate product exists and get its details
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    console.log('Product found:', {
      id: product._id,
      name: product.name,
      price: product.price,
      image: product.image
    });

    let cart = await Cart.findOne({ user: req.user._id });
    
    // If cart exists, update all existing items with their product details
    if (cart) {
      for (let item of cart.items) {
        const existingProduct = await Product.findById(item.product);
        if (existingProduct) {
          item.productName = existingProduct.name;
          item.productPrice = existingProduct.price;
          item.productImage = existingProduct.image;
        }
      }
    }

    if (!cart) {
      // Create new cart with initial item
      const newItem = {
        product: productId,
        productName: product.name,
        productPrice: product.price,
        productImage: product.image,
        quantity
      };

      console.log('Creating new cart with item:', newItem);

      cart = new Cart({
        user: req.user._id,
        items: [newItem]
      });
    } else {
      // Add item to existing cart
      const itemIndex = cart.items.findIndex(item => 
        item.product.toString() === productId.toString()
      );

      if (itemIndex > -1) {
        // Update existing item
        cart.items[itemIndex].quantity += quantity;
        cart.items[itemIndex].productName = product.name;
        cart.items[itemIndex].productPrice = product.price;
        cart.items[itemIndex].productImage = product.image;
      } else {
        // Add new item
        const newItem = {
          product: productId,
          productName: product.name,
          productPrice: product.price,
          productImage: product.image,
          quantity
        };

        console.log('Adding new item to cart:', newItem);
        cart.items.push(newItem);
      }
    }

    console.log('Saving cart with items:', cart.items);
    await cart.save();
    
    // Fetch the updated cart to ensure we have the latest data
    cart = await Cart.findOne({ user: req.user._id });
    
    if (!cart) {
      return res.json({ items: [] });
    }

    res.json({
      message: 'Item added to cart successfully',
      items: cart.items
    });
  } catch (error) {
    console.error('Error adding item to cart:', error);
    res.status(500).json({ 
      message: 'Error adding item to cart',
      error: error.message 
    });
  }
};

// Update cart item quantity
exports.updateQuantity = async (req, res) => {
  try {
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
  } catch (error) {
    console.error('Error updating cart quantity:', error);
    res.status(500).json({ message: error.message });
  }
};

// Remove item from cart
exports.removeFromCart = async (req, res) => {
  try {
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
  } catch (error) {
    console.error('Error removing item from cart:', error);
    res.status(500).json({ 
      message: 'Error removing item from cart',
      error: error.message 
    });
  }
};

// Clear cart
exports.clearCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    await cart.clear();
    res.json({ message: 'Cart cleared successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}; 