const mongoose = require('mongoose');
const Category = require('../models/Category');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const defaultCategories = [
  {
    name: 'health',
    displayName: 'Health',
    description: 'Health and wellness products',
    sortOrder: 1
  },
  {
    name: 'beauty',
    displayName: 'Beauty',
    description: 'Beauty and skincare products',
    sortOrder: 2
  },
  {
    name: 'wellness',
    displayName: 'Wellness',
    description: 'Wellness and fitness products',
    sortOrder: 3
  },
  {
    name: 'personal-care',
    displayName: 'Personal Care',
    description: 'Personal care and hygiene products',
    sortOrder: 4
  },
  {
    name: 'supplements',
    displayName: 'Supplements',
    description: 'Nutritional supplements and vitamins',
    sortOrder: 5
  },
  {
    name: 'other',
    displayName: 'Other',
    description: 'Other miscellaneous products',
    sortOrder: 999
  }
];

async function seedCategories() {
  try {
    const MONGODB_URI = process.env.MONGO_URI || 'mongodb+srv://roy282227:13131313SABs@cluster0.xgaiyxu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing categories
    await Category.deleteMany({});
    console.log('Cleared existing categories');

    // Insert default categories
    const categories = await Category.insertMany(defaultCategories);
    console.log(`Seeded ${categories.length} categories:`);
    
    categories.forEach(category => {
      console.log(`- ${category.displayName} (${category.name})`);
    });

    await mongoose.disconnect();
    console.log('Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding categories:', error);
    process.exit(1);
  }
}

seedCategories();
