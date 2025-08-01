const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// MongoDB Connection
const MONGODB_URI = process.env.MONGO_URI || 'mongodb+srv://roy282227:13131313SABs@cluster0.xgaiyxu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

async function addTestProducts() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Import models after connection is established
    const Product = require('../models/Product');
    const Stock = require('../models/Stock');
    const Franchise = require('../models/Franchise');
    
    // Find franchises
    const franchises = await Franchise.find();
    
    if (franchises.length === 0) {
      console.log('No franchises found. Please create franchises first.');
      return;
    }
    
    // Sample products
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
      },
      {
        name: 'Herbal Immunity Booster',
        description: 'Natural immunity booster with herbs and vitamins',
        price: 1299,
        image: 'https://example.com/immunity.jpg',
        category: 'health',
        stock: 75,
        commission: 12
      }
    ];
    
    // Add products and stock
    for (const productData of testProducts) {
      // Check if product already exists
      const existingProduct = await Product.findOne({ name: productData.name });
      
      if (!existingProduct) {
        // Create product
        const product = new Product(productData);
        await product.save();
        console.log(`Created product: ${product.name}`);
        
        // Create stock for each franchise
        for (const franchise of franchises) {
          const stock = new Stock({
            product: product._id,
            franchise: franchise._id,
            currentQuantity: Math.floor(Math.random() * 50) + 10,
            minimumThreshold: 5,
            maximumCapacity: 100
          });
          
          await stock.save();
          console.log(`Created stock for ${product.name} at ${franchise.name}`);
        }
      } else {
        console.log(`Product ${productData.name} already exists`);
      }
    }
    
    console.log('Test products and stock added successfully');
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    
  } catch (error) {
    console.error('Error adding test products:', error);
  }
}

addTestProducts(); 