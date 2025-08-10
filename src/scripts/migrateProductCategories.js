const mongoose = require('mongoose');
const Product = require('../models/Product');
const Category = require('../models/Category');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function migrateProductCategories() {
  try {
    const MONGODB_URI = process.env.MONGO_URI || 'mongodb+srv://roy282227:13131313SABs@cluster0.xgaiyxu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find all products with string categories or null/undefined categories
    const products = await Product.find({
      $or: [
        { category: { $type: "string" } },
        { category: null },
        { category: { $exists: false } }
      ]
    });
    console.log(`Found ${products.length} products needing migration`);

    if (products.length === 0) {
      console.log('No products need migration. All products already use ObjectId categories.');
      process.exit(0);
    }

    // Get all categories for reference
    const categories = await Category.find({});
    console.log('Available categories:');
    categories.forEach(cat => {
      console.log(`- ${cat.name} (${cat.displayName}) -> ${cat._id}`);
    });

    let migrated = 0;
    let failed = 0;

    for (const product of products) {
      try {
        // Skip if category is null or undefined
        if (!product.category) {
          console.log(`⚠ Product "${product.name}" has no category, assigning to "Other"`);
          const otherCategory = categories.find(cat => cat.name === 'other');
          if (otherCategory) {
            await Product.findByIdAndUpdate(product._id, {
              category: otherCategory._id
            });
            console.log(`→ Assigned product "${product.name}" to "Other" category`);
            migrated++;
          } else {
            console.log(`✗ Failed to migrate product "${product.name}" - no fallback category available`);
            failed++;
          }
          continue;
        }

        // Find matching category by name
        const category = categories.find(cat => 
          cat.name === product.category.toLowerCase()
        );

        if (category) {
          // Update product with category ObjectId
          await Product.findByIdAndUpdate(product._id, {
            category: category._id
          });
          console.log(`✓ Migrated product "${product.name}" from "${product.category}" to "${category.displayName}"`);
          migrated++;
        } else {
          console.log(`⚠ No matching category found for product "${product.name}" with category "${product.category}"`);
          
          // Create a fallback category or assign to "other"
          const otherCategory = categories.find(cat => cat.name === 'other');
          if (otherCategory) {
            await Product.findByIdAndUpdate(product._id, {
              category: otherCategory._id
            });
            console.log(`→ Assigned product "${product.name}" to "Other" category`);
            migrated++;
          } else {
            console.log(`✗ Failed to migrate product "${product.name}" - no fallback category available`);
            failed++;
          }
        }
      } catch (error) {
        console.error(`✗ Error migrating product "${product.name}":`, error);
        failed++;
      }
    }

    console.log('\n--- Migration Summary ---');
    console.log(`✓ Successfully migrated: ${migrated} products`);
    console.log(`✗ Failed: ${failed} products`);
    console.log('--- End Summary ---\n');

    await mongoose.disconnect();
    console.log('Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Error during migration:', error);
    process.exit(1);
  }
}

migrateProductCategories();
