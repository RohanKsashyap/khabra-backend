const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// MongoDB Connection
const MONGODB_URI = process.env.MONGO_URI || 'mongodb+srv://roy282227:13131313SABs@cluster0.xgaiyxu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

async function fixInventoryData() {
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
      console.log('No franchises found. Creating a test franchise...');
      const franchise = new Franchise({
        name: 'Test Franchise',
        location: 'Test Location',
        owner: mongoose.Types.ObjectId(),
        contactNumber: '1234567890',
        email: 'test@example.com',
        status: 'active'
      });
      await franchise.save();
      console.log(`Created franchise: ${franchise.name}`);
      franchises.push(franchise);
    }
    
    // Get products
    let products = await Product.find();
    console.log(`Found ${products.length} products`);
    
    // Create test products if none exist
    if (products.length === 0) {
      console.log('No products found. Creating test products...');
      const testProducts = [
        {
          name: 'Natural Skin Care Set',
          description: 'Complete skin care set with natural ingredients',
          price: 1999,
          image: 'https://example.com/skincare.jpg',
          category: 'beauty',
          stock: 100,
          commission: 10
        },
        {
          name: 'Organic Protein Powder',
          description: 'High quality plant-based protein powder',
          price: 2499,
          image: 'https://example.com/protein.jpg',
          category: 'wellness',
          stock: 50,
          commission: 15
        }
      ];
      
      for (const productData of testProducts) {
        const product = new Product(productData);
        await product.save();
        console.log(`Created product: ${product.name}`);
      }
      
      // Refresh products list
      products = await Product.find();
    }
    
    // Update products with prices if needed
    for (const product of products) {
      if (!product.price || product.price === 0) {
        product.price = Math.floor(Math.random() * 3000) + 500;
        await product.save();
        console.log(`Updated product ${product.name} with price ${product.price}`);
      }
    }
    
    // Check stocks for each franchise and product
    for (const franchise of franchises) {
      for (const product of products) {
        // Check if stock exists
        let stock = await Stock.findOne({ 
          franchise: franchise._id,
          product: product._id
        });
        
        if (!stock) {
          // Create stock
          stock = new Stock({
            franchise: franchise._id,
            product: product._id,
            currentQuantity: Math.floor(Math.random() * 50) + 10,
            minimumThreshold: 5,
            maximumCapacity: 100
          });
          await stock.save();
          console.log(`Created stock for ${product.name} at ${franchise.name} with quantity ${stock.currentQuantity}`);
        } else if (stock.currentQuantity === 0) {
          // Update quantity if zero
          stock.currentQuantity = Math.floor(Math.random() * 50) + 10;
          await stock.save();
          console.log(`Updated stock for ${product.name} at ${franchise.name} with quantity ${stock.currentQuantity}`);
        }
      }
    }
    
    // Verify inventory value
    const franchiseId = franchises[0]._id;
    const stocks = await Stock.find({ franchise: franchiseId }).populate('product', 'name price');
    
    let totalValue = 0;
    for (const stock of stocks) {
      if (stock.product && stock.currentQuantity > 0) {
        const price = stock.product.price || 0;
        const itemValue = price * stock.currentQuantity;
        totalValue += itemValue;
        console.log(`Stock: ${stock.product.name}, Price: ${price}, Quantity: ${stock.currentQuantity}, Value: ${itemValue}`);
      }
    }
    
    console.log(`Total inventory value: ${totalValue}`);
    
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    
  } catch (error) {
    console.error('Error fixing inventory data:', error);
  }
}

fixInventoryData(); 