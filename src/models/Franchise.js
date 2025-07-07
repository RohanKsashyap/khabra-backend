const mongoose = require('mongoose');

const franchiseSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Franchise name is required'],
        trim: true
    },
    location: {
        type: String,
        required: [true, 'Location is required'],
        trim: true
    },
    district: {
        type: String,
        required: [true, 'District is required'],
        enum: [
            'Amritsar', 'Barnala', 'Bathinda', 'Faridkot', 'Fatehgarh Sahib',
            'Fazilka', 'Ferozepur', 'Gurdaspur', 'Hoshiarpur', 'Jalandhar',
            'Kapurthala', 'Ludhiana', 'Mansa', 'Moga', 'Muktsar',
            'Nawanshahr', 'Pathankot', 'Patiala', 'Rupnagar', 'Mohali',
            'Sangrur', 'Tarn Taran'
        ]
    },
    address: {
        type: String,
        required: [true, 'Address is required']
    },
    contactPerson: {
        type: String,
        required: [true, 'Contact person name is required']
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        match: [/^[0-9]{10}$/, 'Please enter a valid 10-digit phone number']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    openingDate: {
        type: Date,
        default: Date.now
    },
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    commissionPercentage: {
        type: Number,
        required: true,
        min: 0,
        max: 100
    },
    // Franchise statistics
    totalSales: {
        online: {
            type: Number,
            default: 0
        },
        offline: {
            type: Number,
            default: 0
        },
        total: {
            type: Number,
            default: 0
        }
    },
    totalDownline: {
        type: Number,
        default: 0
    },
    totalCommission: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Indexes for better performance
franchiseSchema.index({ ownerId: 1 });
franchiseSchema.index({ district: 1 });
franchiseSchema.index({ status: 1 });

module.exports = mongoose.model('Franchise', franchiseSchema); 