require('dotenv').config({ path: './src/.env' });
const mongoose = require('mongoose');
const Product = require('../models/Product');
const connectDB = require('../config/db');

// Connect to database
connectDB();

async function migrateProductCommissions() {
  try {
    console.log('=== MIGRATING PRODUCT COMMISSION FIELDS ===\n');

    // Get all products
    const products = await Product.find().lean();
    console.log(`Found ${products.length} products to migrate`);

    if (products.length === 0) {
      console.log('No products found to migrate!');
      return;
    }

    let migratedCount = 0;
    let skippedCount = 0;

    for (const product of products) {
      try {
        const updateData = {};
        let needsUpdate = false;

        // If product has old commission field but low/zero selfCommission, transfer the value
        if (product.commission && (!product.selfCommission || product.selfCommission < 3)) {
          updateData.selfCommission = Math.min(product.commission, 15); // Cap at 15% for self-commission
          needsUpdate = true;
          console.log(`📦 ${product.name}: Transferring commission ${product.commission}% → selfCommission ${updateData.selfCommission}%`);
        }

        // Remove the old commission field completely
        if (product.hasOwnProperty('commission')) {
          updateData.$unset = { commission: 1 };
          needsUpdate = true;
        }

        // Ensure selfCommission has a reasonable default if it's 0
        if (!product.selfCommission || product.selfCommission === 0) {
          if (!updateData.selfCommission) {
            // Set based on category and price
            if (product.category === 'health') {
              updateData.selfCommission = product.price > 1000 ? 8 : 5;
            } else if (product.category === 'beauty') {
              updateData.selfCommission = product.price > 800 ? 6 : 4;
            } else if (product.category === 'wellness') {
              updateData.selfCommission = 3;
            } else {
              updateData.selfCommission = 2;
            }
            needsUpdate = true;
            console.log(`📦 ${product.name}: Setting default selfCommission ${updateData.selfCommission}% (${product.category})`);
          }
        }

        if (needsUpdate) {
          await Product.findByIdAndUpdate(product._id, updateData);
          migratedCount++;
        } else {
          skippedCount++;
        }

      } catch (error) {
        console.error(`❌ Error migrating product ${product.name}:`, error.message);
      }
    }

    console.log(`\n✅ Migration completed!`);
    console.log(`   Migrated: ${migratedCount} products`);
    console.log(`   Skipped: ${skippedCount} products (no changes needed)`);

    // Verify the results
    console.log('\n🔍 Verification:');
    const updatedProducts = await Product.find().select('name selfCommission commission').lean();
    
    const withCommissionField = updatedProducts.filter(p => p.hasOwnProperty('commission'));
    const withoutSelfCommission = updatedProducts.filter(p => !p.selfCommission || p.selfCommission === 0);
    
    console.log(`   Products with old commission field: ${withCommissionField.length}`);
    console.log(`   Products without selfCommission: ${withoutSelfCommission.length}`);
    
    if (withCommissionField.length > 0) {
      console.log('\n⚠️ Products still with old commission field:');
      withCommissionField.forEach(p => {
        console.log(`   - ${p.name}: commission=${p.commission}`);
      });
    }

    if (withoutSelfCommission.length > 0) {
      console.log('\n⚠️ Products without selfCommission:');
      withoutSelfCommission.forEach(p => {
        console.log(`   - ${p.name}: selfCommission=${p.selfCommission}`);
      });
    }

    if (withCommissionField.length === 0 && withoutSelfCommission.length === 0) {
      console.log('✅ All products successfully migrated!');
    }

    console.log('\n💡 New products created by admin will now use the selfCommission field only.');

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the migration
migrateProductCommissions();
