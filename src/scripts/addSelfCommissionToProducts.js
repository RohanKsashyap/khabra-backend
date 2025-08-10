require('dotenv').config({ path: './src/.env' });
const mongoose = require('mongoose');
const Product = require('../models/Product');
const connectDB = require('../config/db');

// Connect to database
connectDB();

async function addSelfCommissionToProducts() {
  try {
    console.log('=== ADDING SELF-COMMISSION TO PRODUCTS ===\n');

    // Get all products
    const products = await Product.find();
    console.log(`Found ${products.length} products`);

    if (products.length === 0) {
      console.log('No products found!');
      return;
    }

    // Update products with self-commission based on their category or price
    const updates = [];
    
    for (const product of products) {
      let selfCommissionRate = 0;
      
      // Set different self-commission rates based on category and price
      if (product.category === 'health') {
        selfCommissionRate = product.price > 1000 ? 8 : 5; // 8% for expensive health products, 5% for others
      } else if (product.category === 'beauty') {
        selfCommissionRate = product.price > 800 ? 6 : 4; // 6% for expensive beauty products, 4% for others
      } else if (product.category === 'wellness') {
        selfCommissionRate = 3; // 3% for wellness products
      } else {
        selfCommissionRate = 2; // 2% for other categories
      }

      // Update the product
      await Product.findByIdAndUpdate(product._id, {
        selfCommission: selfCommissionRate
      });

      updates.push({
        name: product.name,
        category: product.category,
        price: product.price,
        oldSelfCommission: product.selfCommission || 0,
        newSelfCommission: selfCommissionRate
      });

      console.log(`✅ ${product.name} (${product.category}) - ₹${product.price}: ${selfCommissionRate}% self-commission`);
    }

    console.log(`\n🎉 Successfully updated ${updates.length} products with self-commission rates!`);
    
    // Show summary
    console.log('\n📊 SELF-COMMISSION SUMMARY:');
    const rateSummary = updates.reduce((acc, update) => {
      const rate = update.newSelfCommission;
      acc[rate] = (acc[rate] || 0) + 1;
      return acc;
    }, {});

    Object.entries(rateSummary).forEach(([rate, count]) => {
      console.log(`   ${rate}%: ${count} products`);
    });

    console.log('\n💡 Now when users buy these products and orders are delivered, they will get self-commission!');

  } catch (error) {
    console.error('Error updating products:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the script
addSelfCommissionToProducts();
