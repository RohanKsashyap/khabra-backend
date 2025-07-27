const mongoose = require('mongoose');

const AuditItemSchema = new mongoose.Schema({
  audit: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InventoryAudit',
    required: true
  },
  stock: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Stock',
    required: true
  },
  systemQuantity: {
    type: Number,
    required: true,
    min: 0
  },
  actualQuantity: {
    type: Number,
    required: true,
    min: 0
  },
  discrepancy: {
    type: Number,
    default: 0
  },
  discrepancyPercentage: {
    type: Number,
    default: 0
  },
  checkedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  notes: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['MATCHED', 'DISCREPANCY', 'NEEDS_REVIEW'],
    default: 'MATCHED'
  }
}, {
  timestamps: true,
  methods: {
    // Calculate discrepancy and update status
    calculateDiscrepancy() {
      this.discrepancy = this.actualQuantity - this.systemQuantity;
      this.discrepancyPercentage = Math.abs((this.discrepancy / this.systemQuantity) * 100);
      
      // Update status based on discrepancy
      if (this.discrepancy !== 0) {
        this.status = 'DISCREPANCY';
      } else {
        this.status = 'MATCHED';
      }
      
      return this;
    }
  }
});

// Pre-save hook to calculate discrepancy
AuditItemSchema.pre('save', function(next) {
  this.calculateDiscrepancy();
  next();
});

// Create indexes for efficient querying
AuditItemSchema.index({ audit: 1, stock: 1 });
AuditItemSchema.index({ status: 1 });

module.exports = mongoose.model('AuditItem', AuditItemSchema); 