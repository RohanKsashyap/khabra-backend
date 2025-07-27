const mongoose = require('mongoose');
const Product = require('../models/Product');
require('dotenv').config({ path: '../../.env' });

const updateProductPrices = async () => {
  try {
    // Connect to MongoDB
    const MONGODB_URI = process.env.MONGO_URI || 'mongodb+srv://roy282227:13131313SABs@cluster0.xgaiyxu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get all products
    const products = await Product.find();
    console.log(`Found ${products.length} products`);

    // Sample prices by category
    const categoryPrices = {
      'beauty': { min: 1200, max: 3000 },
      'wellness': { min: 1500, max: 4000 },
      'health': { min: 800, max: 2500 },
      'other': { min: 500, max: 1500 }
    };

    // Update each product with a price if it doesn't have one
    let updatedCount = 0;
    for (const product of products) {
      if (!product.price || product.price === 0) {
        const category = product.category.toLowerCase();
        const priceRange = categoryPrices[category] || categoryPrices.other;
        
        // Generate a random price within the range
        const price = Math.floor(Math.random() * (priceRange.max - priceRange.min + 1)) + priceRange.min;
        
        // Update the product
        product.price = price;
        await product.save();
        
        console.log(`Updated ${product.name} with price ${price}`);
        updatedCount++;
      }
    }

    console.log(`Updated ${updatedCount} products with prices`);
    
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    
    process.exit(0);
  } catch (error) {
    console.error('Error updating product prices:', error);
    process.exit(1);
  }
};

// Run the function
updateProductPrices(); 