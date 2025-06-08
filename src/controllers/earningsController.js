const getEarnings = async (req, res) => {
  try {
    // In a real application, you would fetch actual earnings data for the logged-in user
    // For now, let's return some mock data
    const mockEarnings = [
      {
        id: 'e1',
        amount: 500,
        type: 'direct',
        description: 'Commission from direct sale',
        date: new Date().toISOString(),
        status: 'completed',
      },
      {
        id: 'e2',
        amount: 200,
        type: 'level',
        description: 'Commission from level 2 referral',
        date: new Date(Date.now() - 86400000 * 5).toISOString(), // 5 days ago
        status: 'pending',
      },
      {
        id: 'e3',
        amount: 1000,
        type: 'rank',
        description: 'Bonus for achieving Gold Rank',
        date: new Date(Date.now() - 86400000 * 10).toISOString(), // 10 days ago
        status: 'completed',
      },
    ];

    const totalEarnings = mockEarnings.reduce((acc, curr) => acc + curr.amount, 0);
    const pendingEarnings = mockEarnings.reduce((acc, curr) => 
      curr.status === 'pending' ? acc + curr.amount : acc, 0
    );
    const thisMonth = mockEarnings.filter(e => new Date(e.date).getMonth() === new Date().getMonth())
                                   .reduce((acc, curr) => acc + curr.amount, 0);
    const lastMonth = mockEarnings.filter(e => new Date(e.date).getMonth() === new Date().getMonth() - 1)
                                   .reduce((acc, curr) => acc + curr.amount, 0);

    res.status(200).json({
      earnings: mockEarnings,
      stats: {
        totalEarnings,
        pendingEarnings,
        thisMonth,
        lastMonth,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching earnings', error: error.message });
  }
};

module.exports = {
  getEarnings,
}; 