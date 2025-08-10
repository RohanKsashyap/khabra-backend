const mongoose = require('mongoose');
const Product = require('../models/Product');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function verifyMigration() {
  try {
    const MONGODB_URI = process.env.MONGO_URI || 'mongodb+srv://roy282227:13131313SABs@cluster0.xgaiyxu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Check for any remaining string categories
    const stringCategories = await Product.find({ category: { $type: 'string' } });
    console.log(`Products with string categories: ${stringCategories.length}`);
    
    // Check for null/undefined categories
    const nullCategories = await Product.find({
      $or: [
        { category: null },
        { category: { $exists: false } }
      ]
    });
    console.log(`Products with null/undefined categories: ${nullCategories.length}`);
    
    // Check total products with ObjectId categories
    const objectIdCategories = await Product.find({ category: { $type: 'objectId' } });
    console.log(`Products with ObjectId categories: ${objectIdCategories.length}`);
    
    // Show total products
    const totalProducts = await Product.countDocuments();
    console.log(`Total products: ${totalProducts}`);
    
    if (stringCategories.length > 0) {
      console.log('\nRemaining products with string categories:');
      stringCategories.forEach(product => {
        console.log(`- ${product.name}: "${product.category}"`);
      });
    }
    
    if (nullCategories.length > 0) {
      console.log('\nProducts with null/undefined categories:');
      nullCategories.forEach(product => {
        console.log(`- ${product.name}: ${product.category}`);
      });
    }
    
    await mongoose.disconnect();
    console.log('\n✅ Migration verification complete!');
    
    if (stringCategories.length === 0 && nullCategories.length === 0) {
      console.log('🎉 All products have been successfully migrated to ObjectId categories!');
    } else {
      console.log('⚠️  Some products still need migration.');
    }
    
  } catch (error) {
    console.error('Error during verification:', error);
    process.exit(1);
  }
}

verifyMigration();
