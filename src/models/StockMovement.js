const mongoose = require('mongoose');

const StockMovementSchema = new mongoose.Schema({
  stock: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Stock',
    required: true
  },
  type: {
    type: String,
    enum: [
      'STOCK_IN', 
      'STOCK_OUT', 
      'ADJUSTMENT', 
      'RETURN', 
      'DAMAGED', 
      'EXPIRED'
    ],
    required: true
  },
  previousQuantity: {
    type: Number,
    required: true,
    min: 0
  },
  changeAmount: {
    type: Number,
    required: true
  },
  newQuantity: {
    type: Number,
    required: true,
    min: 0
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  referenceNumber: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  relatedDocument: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'relatedDocumentModel'
  },
  relatedDocumentModel: {
    type: String,
    enum: ['Order', 'ReturnRequest', 'InventoryAudit']
  }
}, {
  timestamps: true
});

// Validation to ensure change amount makes sense
StockMovementSchema.pre('validate', function(next) {
  // Ensure new quantity is calculated correctly
  const expectedNewQuantity = this.previousQuantity + this.changeAmount;
  if (Math.abs(expectedNewQuantity - this.newQuantity) > 0.001) {
    next(new Error('New quantity does not match previous quantity and change amount'));
  }
  next();
});

// Create indexes for efficient querying
StockMovementSchema.index({ stock: 1, createdAt: -1 });
StockMovementSchema.index({ type: 1, createdAt: -1 });

module.exports = mongoose.model('StockMovement', StockMovementSchema); 