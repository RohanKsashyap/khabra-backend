const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('./models/Product');
const connectDB = require('./config/db');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

// Sample products
const products = [
  {
    name: 'Premium Health Supplement',
    description: 'A daily multivitamin supplement for optimal health and immunity.',
    price: 1499,
    image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg',
    category: 'health',
    stock: 100,
    commission: 15,
    isActive: true,
  },
  {
    name: 'Natural Skin Care Set',
    description: 'A complete set of natural skin care products for radiant skin.',
    price: 2999,
    image: 'https://images.pexels.com/photos/3685530/pexels-photo-3685530.jpeg',
    category: 'beauty',
    stock: 50,
    commission: 20,
    isActive: true,
  },
  {
    name: 'Organic Protein Powder',
    description: 'Plant-based protein powder for muscle growth and recovery.',
    price: 1999,
    image: 'https://images.pexels.com/photos/4397840/pexels-photo-4397840.jpeg',
    category: 'wellness',
    stock: 75,
    commission: 18,
    isActive: true,
  },
  {
    name: 'Essential Oils Collection',
    description: 'Set of 6 essential oils for aromatherapy and wellness.',
    price: 3499,
    image: 'https://images.pexels.com/photos/4210373/pexels-photo-4210373.jpeg',
    category: 'wellness',
    stock: 30,
    commission: 25,
    isActive: true,
  },
  {
    name: 'Home Cleaning Kit',
    description: 'Eco-friendly cleaning products for your home.',
    price: 2499,
    image: 'https://images.pexels.com/photos/4239013/pexels-photo-4239013.jpeg',
    category: 'other',
    stock: 45,
    commission: 12,
    isActive: true,
  },
];

// Import data
const importData = async () => {
  try {
    await Product.deleteMany();
    await Product.insertMany(products);
    console.log('Data Imported!');
    process.exit();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

// Delete data
const destroyData = async () => {
  try {
    await Product.deleteMany();
    console.log('Data Destroyed!');
    process.exit();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

if (process.argv[2] === '-d') {
  destroyData();
} else {
  importData();
} 