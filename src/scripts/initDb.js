const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const Product = require('../models/Product');
const Cart = require('../models/Cart');
const Order = require('../models/Order');

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/khabra-mlm';

// Sample data
const sampleProducts = [
  {
    name: 'Product 1',
    description: 'Description for Product 1',
    price: 99.99,
    category: 'Category 1',
    image: 'https://via.placeholder.com/150',
    stock: 100
  },
  {
    name: 'Product 2',
    description: 'Description for Product 2',
    price: 149.99,
    category: 'Category 2',
    image: 'https://via.placeholder.com/150',
    stock: 50
  }
];

const initializeDb = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Product.deleteMany({});
    await Cart.deleteMany({});
    await Order.deleteMany({});
    console.log('Cleared existing data');

    // Create sample products
    const products = await Product.insertMany(sampleProducts);
    console.log('Created sample products');

    // Create a test user
    const user = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      role: 'user'
    });
    console.log('Created test user');

    // Create a cart for the test user
    const cart = await Cart.create({
      user: user._id,
      items: [{
        product: products[0]._id,
        quantity: 2
      }]
    });
    console.log('Created test cart');

    // Create a sample order
    const order = await Order.create({
      user: user._id,
      items: [{
        product: products[0]._id,
        quantity: 1,
        price: products[0].price
      }],
      totalAmount: products[0].price,
      status: 'pending'
    });
    console.log('Created sample order');

    console.log('Database initialized successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
};

initializeDb(); 