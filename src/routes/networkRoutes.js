const express = require('express');
const router = express.Router();

// @route   GET /api/network
// @desc    Get user network tree
// @access  Private
router.get('/', async (req, res) => {
  try {
    const networkData = {
      root: {
        id: 'u1',
        name: 'Rohan (You)',
        email: 'rohan@example.com',
        role: 'distributor',
        rank: 'Gold',
        directReferrals: 5,
        totalSales: 15000,
        children: [
          {
            id: 'u2',
            name: 'Priya',
            email: 'priya@example.com',
            role: 'distributor',
            rank: 'Silver',
            directReferrals: 2,
            totalSales: 5000,
            children: [
              {
                id: 'u4',
                name: 'Amit',
                email: 'amit@example.com',
                role: 'distributor',
                rank: 'Bronze',
                directReferrals: 1,
                totalSales: 1000,
                children: [],
              },
            ],
          },
          {
            id: 'u3',
            name: 'Suresh',
            email: 'suresh@example.com',
            role: 'distributor',
            rank: 'Bronze',
            directReferrals: 1,
            totalSales: 2000,
            children: [],
          },
        ],
      },
      teamStats: {
        totalMembers: 7,
        activeMembers: 5,
        totalTeamSales: 23000,
      },
    };

    res.json(networkData);
  } catch (error) {
    console.error('Error fetching network data:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router; 