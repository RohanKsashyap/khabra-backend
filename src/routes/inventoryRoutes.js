const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Inventory statistics
router.get('/stats',
  protect,
  authorize('franchise', 'admin'),
  inventoryController.getInventoryStats
);

// Stock Levels
router.get('/stock-levels/:franchiseId', 
  protect, 
  authorize('franchise', 'admin'), 
  inventoryController.getStockLevels
);

// Create or update stock
router.post('/stock', 
  protect, 
  authorize('franchise', 'admin'), 
  inventoryController.createOrUpdateStock
);

// Stock Movements
router.get('/stock-movements/:stockId', 
  protect, 
  authorize('franchise', 'admin'), 
  inventoryController.getStockMovementHistory
);

// Record stock movement
router.post('/stock-movement', 
  protect, 
  authorize('franchise', 'admin'), 
  inventoryController.recordStockMovement
);

// Inventory Audits
router.post('/audits/initiate', 
  protect, 
  authorize('franchise', 'admin'), 
  inventoryController.initiateInventoryAudit
);

// Stock by category
router.get('/stock-by-category/:franchiseId', 
  protect, 
  authorize('franchise', 'admin'), 
  inventoryController.getStockByCategory
);

router.post('/audits/add-items', 
  protect, 
  authorize('franchise', 'admin'), 
  inventoryController.addAuditItems
);

router.post('/audits/complete', 
  protect, 
  authorize('franchise', 'admin'), 
  inventoryController.completeInventoryAudit
);

// Get ongoing audit for a franchise
router.get('/audits/ongoing/:franchiseId',
  protect,
  authorize('franchise', 'admin'),
  inventoryController.getOngoingAudit
);

// Get audit history for a franchise
router.get('/audits/history/:franchiseId',
  protect,
  authorize('franchise', 'admin'),
  inventoryController.getAuditHistory
);

// Get audit details
router.get('/audits/:auditId',
  protect,
  authorize('franchise', 'admin'),
  inventoryController.getAuditDetails
);

// Debug endpoint for inventory stats
router.get('/debug-stats/:franchiseId', 
  inventoryController.debugInventoryStats
);

module.exports = router; 