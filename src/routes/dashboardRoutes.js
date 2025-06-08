const express = require('express');
const router = express.Router();

// @route   GET /api/users/earnings
// @desc    Get user earnings
// @access  Private
router.get('/earnings', async (req, res) => {
  try {
    // In a real application, you would fetch actual earnings data from a database
    // For now, we'll return mock data
    const earnings = [
      {
        id: 'e1',
        amount: 1500,
        type: 'direct',
        description: 'Direct commission for sale #123',
        date: '2023-01-15T10:00:00Z',
        status: 'completed',
      },
      {
        id: 'e2',
        amount: 250,
        type: 'level',
        description: 'Level 1 bonus from team sales',
        date: '2023-01-20T11:00:00Z',
        status: 'pending',
      },
      {
        id: 'e3',
        amount: 500,
        type: 'rank',
        description: 'Monthly rank bonus for Gold Rank',
        date: '2023-02-01T09:00:00Z',
        status: 'completed',
      },
      {
        id: 'e4',
        amount: 1000,
        type: 'reward',
        description: 'Leadership reward payout',
        date: '2023-02-10T14:00:00Z',
        status: 'pending',
      },
    ];

    const stats = {
      totalEarnings: 3250,
      pendingEarnings: 1250,
      thisMonth: 1500,
      lastMonth: 1750,
    };

    res.json({ earnings, stats });
  } catch (error) {
    console.error('Error fetching earnings:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @route   GET /api/ranks
// @desc    Get user rank and rewards
// @access  Private
router.get('/ranks', async (req, res) => {
  try {
    const userRank = {
      currentRank: {
        name: 'Gold',
        description: 'Achieved by consistent performance and team growth.',
        requirements: {
          directReferrals: 6,
          teamSize: 50,
          teamSales: 100000,
        },
      },
      nextRank: {
        name: 'Platinum',
        description: 'The next step in your MLM journey, with greater rewards.',
        requirements: {
          directReferrals: 10,
          teamSize: 150,
          teamSales: 300000,
        },
      },
      progress: {
        directReferrals: 5,
        teamSize: 30,
        teamSales: 75000,
      },
      achievements: [
        {
          id: 'a1',
          name: 'Fast Start Bonus',
          description: 'Achieved within first 30 days of joining.',
          date: '2022-11-20T00:00:00Z',
          reward: 500,
        },
        {
          id: 'a2',
          name: 'First Team Sale',
          description: 'Your team made its first collective sale.',
          date: '2022-12-05T00:00:00Z',
          reward: 100,
        },
      ],
    };

    res.json(userRank);
  } catch (error) {
    console.error('Error fetching rank data:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @route   GET /api/network
// @desc    Get user network tree
// @access  Private
router.get('/network', async (req, res) => {
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