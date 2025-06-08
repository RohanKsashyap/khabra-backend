const express = require('express');
const router = express.Router();

// Dummy rank data
router.get('/', (req, res) => {
  res.json({
    currentRank: {
      id: '1',
      name: 'Silver',
      level: 1,
      requirements: {
        directReferrals: 5,
        teamSize: 20,
        teamSales: 50000,
      },
      rewards: {
        commission: 5,
        bonus: 1000,
      },
    },
    nextRank: {
      id: '2',
      name: 'Gold',
      level: 2,
      requirements: {
        directReferrals: 10,
        teamSize: 50,
        teamSales: 100000,
      },
      rewards: {
        commission: 7,
        bonus: 3000,
      },
    },
    progress: {
      directReferrals: 4,
      teamSize: 18,
      teamSales: 35000,
    },
    achievements: [
      {
        id: 'a1',
        name: 'Starter Bonus',
        description: 'First 3 Referrals Achieved',
        date: '2024-06-01',
        reward: 500,
      },
    ],
  });
});

module.exports = router; 