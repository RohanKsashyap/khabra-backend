const mongoose = require('mongoose');

const franchiseSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Franchise name is required'],
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
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Franchise', franchiseSchema); 