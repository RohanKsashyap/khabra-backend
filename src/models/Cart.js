const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    productName: {
      type: String,
      required: [true, 'Product name is required']
    },
    productPrice: {
      type: Number,
      required: [true, 'Product price is required'],
      min: [0, 'Price cannot be negative']
    },
    productImage: {
      type: String,
      required: [true, 'Product image is required']
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1']
    }
  }],
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  validateBeforeSave: true
});

// Add indexes for better query performance
cartSchema.index({ user: 1 });

// Virtual for total items in cart
cartSchema.virtual('totalItems').get(function() {
  return this.items.reduce((total, item) => total + item.quantity, 0);
});

// Pre-save middleware to ensure all required fields are present
cartSchema.pre('save', function(next) {
  if (this.items && this.items.length > 0) {
    this.items.forEach((item, index) => {
      if (!item.productName || !item.productPrice || !item.productImage) {
        throw new Error(`Missing required fields for item at index ${index}`);
      }
    });
  }
  next();
});

// Method to add item to cart
cartSchema.methods.addItem = async function(productId, quantity = 1) {
  const Product = mongoose.model('Product');
  const product = await Product.findById(productId);
  
  if (!product) {
    throw new Error('Product not found');
  }

  const itemIndex = this.items.findIndex(item => 
    item.product.toString() === productId.toString()
  );

  if (itemIndex > -1) {
    // Update existing item
    this.items[itemIndex].quantity += quantity;
    this.items[itemIndex].productName = product.name;
    this.items[itemIndex].productPrice = product.price;
    this.items[itemIndex].productImage = product.image;
  } else {
    // Add new item
    const newItem = {
      product: productId,
      productName: product.name,
      productPrice: product.price,
      productImage: product.image,
      quantity
    };
    this.items.push(newItem);
  }

  this.lastUpdated = new Date();
  return this.save();
};

// Method to remove item from cart
cartSchema.methods.removeItem = async function(productId) {
  this.items = this.items.filter(item => 
    item.product.toString() !== productId.toString()
  );
  this.lastUpdated = new Date();
  if (this.items.length === 0) {
    await this.deleteOne();
    return null;
  }
  return this.save();
};

// Method to update item quantity
cartSchema.methods.updateQuantity = async function(productId, quantity) {
  const Product = mongoose.model('Product');
  const product = await Product.findById(productId);
  
  if (!product) {
    throw new Error('Product not found');
  }

  const itemIndex = this.items.findIndex(item => 
    item.product.toString() === productId.toString()
  );

  if (itemIndex > -1) {
    if (quantity <= 0) {
      this.items.splice(itemIndex, 1);
    } else {
      this.items[itemIndex].quantity = quantity;
      this.items[itemIndex].productName = product.name;
      this.items[itemIndex].productPrice = product.price;
      this.items[itemIndex].productImage = product.image;
    }
    this.lastUpdated = new Date();
    if (this.items.length === 0) {
      await this.deleteOne();
      return null;
    }
    return this.save();
  }
  return this;
};

// Method to clear cart
cartSchema.methods.clear = async function() {
  this.items = [];
  this.lastUpdated = new Date();
  if (this.items.length === 0) {
    await this.deleteOne();
    return null;
  }
  return this.save();
};

const Cart = mongoose.model('Cart', cartSchema);

module.exports = Cart; 