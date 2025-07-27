const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// MongoDB Connection
const MONGODB_URI = process.env.MONGO_URI || 'mongodb+srv://roy282227:13131313SABs@cluster0.xgaiyxu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

async function testInventoryStats() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Import models
    const Product = require('../models/Product');
    const Stock = require('../models/Stock');
    const Franchise = require('../models/Franchise');
    
    // Get franchises
    const franchises = await Franchise.find();
    console.log(`Found ${franchises.length} franchises`);
    
    if (franchises.length === 0) {
      console.log('No franchises found. Please create franchises first.');
      return;
    }
    
    // For testing, use the first franchise
    const franchiseId = franchises[0]._id;
    console.log(`Using franchise: ${franchises[0].name} (${franchiseId})`);
    
    // Get products
    const products = await Product.find();
    console.log(`Found ${products.length} products`);
    products.forEach(p => console.log(`Product: ${p.name}, Price: ${p.price || 'N/A'}`));
    
    // Get stocks for this franchise
    const stocks = await Stock.find({ franchise: franchiseId }).populate('product', 'name price');
    console.log(`Found ${stocks.length} stock entries for franchise`);
    
    // Calculate inventory value
    let totalValue = 0;
    
    stocks.forEach(stock => {
      if (stock.product && stock.currentQuantity > 0) {
        const price = stock.product.price || 0;
        const itemValue = price * stock.currentQuantity;
        totalValue += itemValue;
        
        console.log(`Stock: ${stock.product.name}, Price: ${price}, Quantity: ${stock.currentQuantity}, Value: ${itemValue}`);
      } else {
        console.log(`Stock without product or zero quantity: ${stock._id}`);
      }
    });
    
    console.log(`Total inventory value: ${totalValue}`);
    
    // If no value, check for issues
    if (totalValue === 0) {
      console.log('Inventory value is zero. Checking for issues:');
      
      // Check if products have prices
      const productsWithoutPrices = await Product.find({ $or: [{ price: { $exists: false } }, { price: 0 }] });
      console.log(`Products without prices: ${productsWithoutPrices.length}`);
      
      // Check if stocks have quantities
      const stocksWithoutQuantities = await Stock.find({ currentQuantity: 0 });
      console.log(`Stocks with zero quantity: ${stocksWithoutQuantities.length}`);
      
      // Update products with prices if needed
      if (productsWithoutPrices.length > 0) {
        console.log('Updating products with prices...');
        for (const product of productsWithoutPrices) {
          product.price = Math.floor(Math.random() * 3000) + 500;
          await product.save();
          console.log(`Updated ${product.name} with price ${product.price}`);
        }
      }
      
      // Update stocks with quantities if needed
      if (stocksWithoutQuantities.length > 0 && stocks.length > 0) {
        console.log('Updating stocks with quantities...');
        for (const stock of stocksWithoutQuantities) {
          stock.currentQuantity = Math.floor(Math.random() * 50) + 10;
          await stock.save();
          console.log(`Updated stock ${stock._id} with quantity ${stock.currentQuantity}`);
        }
      }
    }
    
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    
  } catch (error) {
    console.error('Error testing inventory stats:', error);
  }
}

testInventoryStats(); 