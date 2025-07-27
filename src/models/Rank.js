const mongoose = require('mongoose');

const rankSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  level: {
    type: Number,
    required: true,
    unique: true,
    validate: {
      validator: function(v) {
        // Ensure level is a valid number and not NaN
        return !isNaN(v) && isFinite(v) && v >= 0;
      },
      message: props => `${props.value} is not a valid level number!`
    }
  },
  requirements: {
    directReferrals: {
      type: Number,
      required: true,
      min: 0
    },
    teamSize: {
      type: Number,
      required: true,
      min: 0
    },
    teamSales: {
      type: Number,
      required: true,
      min: 0
    },
    personalPV: {
      type: Number,
      required: false,
      min: 0,
      default: 0
    },
    teamPV: {
      type: Number,
      required: false,
      min: 0,
      default: 0
    }
  },
  rewards: {
    commission: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    }
  },
  benefits: [{
    type: String,
    trim: true
  }],
  icon: {
    type: String,
    trim: true
  },
  color: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Ensure level is unique
rankSchema.index({ level: 1 }, { unique: true });

// Pre-save hook to log and validate level
rankSchema.pre('save', function(next) {
  // Ensure level is converted to a number
  if (this.level !== undefined) {
    const numLevel = Number(this.level);
    if (isNaN(numLevel)) {
      console.error(`Invalid level value: ${this.level}`);
      return next(new Error(`Invalid level value: ${this.level}`));
    }
    this.level = numLevel;
  }
  next();
});

const Rank = mongoose.model('Rank', rankSchema);

module.exports = Rank; 