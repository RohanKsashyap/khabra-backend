const mongoose = require('mongoose');

const InventoryAuditSchema = new mongoose.Schema({
  franchise: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Franchise',
    required: true
  },
  startDate: {
    type: Date,
    default: Date.now,
    required: true
  },
  endDate: {
    type: Date
  },
  status: {
    type: String,
    enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
    default: 'PENDING',
    required: true
  },
  initiatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  completedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: {
    type: String,
    trim: true
  },
  totalItemsAudited: {
    type: Number,
    default: 0
  },
  totalDiscrepancies: {
    type: Number,
    default: 0
  },
  discrepancyPercentage: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  methods: {
    // Method to update audit statistics
    updateAuditStatistics(auditItems) {
      this.totalItemsAudited = auditItems.length;
      this.totalDiscrepancies = auditItems.filter(item => item.discrepancy !== 0).length;
      this.discrepancyPercentage = (this.totalDiscrepancies / this.totalItemsAudited) * 100;
      return this;
    },

    // Method to complete the audit
    completeAudit(user, notes = '') {
      this.status = 'COMPLETED';
      this.endDate = new Date();
      this.completedBy = user;
      this.notes = notes;
      return this;
    }
  }
});

// Pre-save hook to validate audit status transitions
InventoryAuditSchema.pre('save', function(next) {
  // Prevent changing status to earlier stage
  const statusOrder = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
  const currentIndex = statusOrder.indexOf(this.status);
  const previousIndex = statusOrder.indexOf(this.get('status'));

  if (previousIndex > currentIndex) {
    return next(new Error('Cannot transition to an earlier audit status'));
  }

  next();
});

// Create indexes for efficient querying
InventoryAuditSchema.index({ franchise: 1, status: 1, startDate: -1 });

module.exports = mongoose.model('InventoryAudit', InventoryAuditSchema); 