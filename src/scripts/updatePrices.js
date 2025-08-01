const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// MongoDB Connection
const MONGODB_URI = process.env.MONGO_URI || 'mongodb+srv://roy282227:13131313SABs@cluster0.xgaiyxu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

async function updateProductPrices() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Import the Product model after connection is established
    const Product = require('../models/Product');
    
    // Get all products
    const products = await Product.find();
    console.log(`Found ${products.length} products`);
    
    // Update prices
    for (const product of products) {
      const randomPrice = Math.floor(Math.random() * 3000) + 500;
      await Product.updateOne(
        { _id: product._id },
        { $set: { price: randomPrice } }
      );
      console.log(`Updated ${product.name} with price ${randomPrice}`);
    }
    
    console.log('Price update complete');
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    
  } catch (error) {
    console.error('Error updating prices:', error);
  }
}

updateProductPrices(); 