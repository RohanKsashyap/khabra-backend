require('dotenv').config({ path: './src/.env' });
const mongoose = require('mongoose');
const connectDB = require('../config/db');

async function removeOldCommissionField() {
  // Connect to database and wait for connection
  await connectDB();
  try {
    console.log('=== REMOVING OLD COMMISSION FIELD ===\n');

    // Direct MongoDB operation to remove the old commission field from all products
    const result = await mongoose.connection.db.collection('products').updateMany(
      { commission: { $exists: true } },
      { $unset: { commission: "" } }
    );

    console.log(`✅ Removed 'commission' field from ${result.modifiedCount} products`);

    // Verify the removal
    const productsWithOldField = await mongoose.connection.db.collection('products').countDocuments({ commission: { $exists: true } });
    console.log(`📊 Products still with old 'commission' field: ${productsWithOldField}`);

    // Show sample of current product structure
    const sampleProducts = await mongoose.connection.db.collection('products').find({}).limit(3).toArray();
    
    console.log('\n🔍 Sample product structures:');
    sampleProducts.forEach((product, index) => {
      console.log(`${index + 1}. ${product.name}:`);
      console.log(`   - selfCommission: ${product.selfCommission}%`);
      console.log(`   - commission: ${product.commission || 'REMOVED'}`);
      console.log(`   - price: ₹${product.price}`);
      console.log(`   - category: ${product.category}`);
      console.log('');
    });

    if (productsWithOldField === 0) {
      console.log('✅ SUCCESS: All products now use only the selfCommission field!');
      console.log('💡 New products created by admin will use selfCommission input field.');
    } else {
      console.log('❌ Some products still have the old commission field.');
    }

  } catch (error) {
    console.error('Error removing old commission field:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the script
removeOldCommissionField();
