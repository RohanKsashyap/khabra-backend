const mongoose = require('mongoose');
const Rank = require('../models/Rank');
const UserRank = require('../models/UserRank');

// Load environment variables
require('dotenv').config({ path: '../../.env' });

async function cleanRankData() {
  try {
    // Connect to the database
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to database');

    // Find and remove ranks with invalid levels
    const invalidRanks = await Rank.find({
      $or: [
        { level: { $exists: false } },
        { level: null },
        { level: NaN },
        { level: { $lt: 0 } }
      ]
    });

    console.log(`Found ${invalidRanks.length} invalid ranks`);

    // Remove invalid ranks
    for (const rank of invalidRanks) {
      console.log(`Removing invalid rank: ${rank.name} (level: ${rank.level})`);
      
      // Remove references in UserRank
      await UserRank.updateMany(
        { $or: [
          { currentRank: rank._id },
          { 'rankHistory.rank': rank._id }
        ]},
        { 
          $unset: { currentRank: 1 },
          $pull: { rankHistory: { rank: rank._id } }
        }
      );

      // Remove the rank
      await Rank.findByIdAndDelete(rank._id);
    }

    // Ensure ranks have sequential levels
    const ranks = await Rank.find().sort({ level: 1 });
    for (let i = 0; i < ranks.length; i++) {
      if (ranks[i].level !== i) {
        console.log(`Updating rank ${ranks[i].name} level from ${ranks[i].level} to ${i}`);
        ranks[i].level = i;
        await ranks[i].save();
      }
    }

    console.log('Rank data cleanup completed');
  } catch (error) {
    console.error('Error during rank data cleanup:', error);
  } finally {
    // Close the database connection
    await mongoose.connection.close();
  }
}

// Run the cleanup
cleanRankData(); 