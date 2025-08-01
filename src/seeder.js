const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path'); // Import path module
const Product = require('./models/Product');
const Rank = require('./models/Rank');
const connectDB = require('./config/db');

// Load env vars from parent directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });

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

// Sample Ranks
const ranks = [
  {
    name: 'Bronze',
    level: 1,
    requirements: { directReferrals: 2, teamSize: 5, teamSales: 50000, personalPV: 1000, teamPV: 50000 },
    rewards: { commission: 5, bonus: 1000 },
  },
  {
    name: 'Silver',
    level: 2,
    requirements: { directReferrals: 5, teamSize: 15, teamSales: 150000, personalPV: 3000, teamPV: 150000 },
    rewards: { commission: 7, bonus: 3000 },
  },
  {
    name: 'Gold',
    level: 3,
    requirements: { directReferrals: 10, teamSize: 30, teamSales: 300000, personalPV: 6000, teamPV: 300000 },
    rewards: { commission: 10, bonus: 5000 },
  },
  {
    name: 'Platinum',
    level: 4,
    requirements: { directReferrals: 20, teamSize: 50, teamSales: 500000, personalPV: 12000, teamPV: 500000 },
    rewards: { commission: 12, bonus: 10000 },
  },
  {
    name: 'Diamond',
    level: 5,
    requirements: { directReferrals: 30, teamSize: 100, teamSales: 1000000, personalPV: 25000, teamPV: 1000000 },
    rewards: { commission: 15, bonus: 20000 },
  },
];

// Import data
const importData = async () => {
  try {
    await Product.deleteMany();
    await Rank.deleteMany();

    await Product.insertMany(products);
    await Rank.insertMany(ranks);

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
    await Rank.deleteMany();
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