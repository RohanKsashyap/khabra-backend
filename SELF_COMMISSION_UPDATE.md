# Self-Commission Feature Implementation

## Overview

A new **Self-Commission** feature has been added to the MLM system to incentivize users to make purchases by giving them a percentage cashback on their own orders. This feature works alongside the existing 5-level MLM commission system and franchise commissions.

## New Features Added

### 1. Product-Level Self-Commission Configuration
- **New Field**: `selfCommission` in Product model
- **Type**: Number (0-100 representing percentage)
- **Default**: 0% (no self-commission)
- **Admin Control**: Admins can set different self-commission rates for different products

### 2. Self-Commission Distribution Logic
- **Trigger**: When order status changes to 'delivered' (same as MLM commissions)
- **Calculation**: `Product Price × Quantity × Self-Commission Percentage`
- **Recipient**: The purchasing user (buyer gets cashback)
- **Tracking**: New earning type `self_commission` in Earning model

### 3. Enhanced Commission Flow
The commission distribution now follows this order:
1. **Self-Commission** (buyer gets cashback first - incentivizes purchases)
2. **MLM Commission** (5-level upline distribution)
3. **Franchise Commission** (if applicable)

## Implementation Details

### Product Model Changes
```javascript
// Added to Product schema
selfCommission: {
  type: Number,
  required: [false, 'Please add self-commission percentage'],
  min: [0, 'Self-commission cannot be negative'],
  max: [100, 'Self-commission cannot exceed 100%'],
  default: 0,
}
```

### Earning Model Changes
```javascript
// Added new earning type
type: {
  type: String,
  enum: ['direct', 'level', 'mlm_level', 'self_commission', 'franchise', 'rank', 'reward', 'withdrawal'],
  required: true
}
```

### Order Model Changes
```javascript
// Enhanced commission tracking
commissions: {
  self: [{
    userId: ObjectId,
    productId: ObjectId,
    productName: String,
    amount: Number,
    percentage: Number,
    status: 'pending' | 'paid',
    paidAt: Date,
    earningId: ObjectId
  }],
  mlm: [...], // existing MLM tracking
  franchise: {...} // existing franchise tracking
}
```

## How It Works

### Example Scenario
**User A** buys the following products:
- **Product X**: ₹1000, 5% self-commission → User A gets ₹50
- **Product Y**: ₹2000, 3% self-commission → User A gets ₹60  
- **Product Z**: ₹1500, 0% self-commission → User A gets ₹0

**Total Self-Commission for User A**: ₹110

### Commission Distribution Order
1. **Self-Commission**: ₹110 → User A (buyer)
2. **MLM Commissions**: 
   - Level 1 (User A's upline): 1.5% of ₹4500 = ₹67.50
   - Level 2: 1.0% of ₹4500 = ₹45.00
   - Level 3: 0.5% of ₹4500 = ₹22.50
   - Level 4: 0.5% of ₹4500 = ₹22.50
   - Level 5: 0.5% of ₹4500 = ₹22.50
3. **Franchise Commission**: (if applicable)

## Admin Configuration

### Setting Self-Commission Rates
Admins can set self-commission percentages when creating or updating products:

```json
{
  "name": "Premium Health Supplement",
  "price": 2500,
  "commission": 10,
  "selfCommission": 5,
  "category": "health",
  "stock": 100
}
```

This product will give buyers a 5% cashback (₹125 on a ₹2500 purchase).

## Key Benefits

### For Users (Buyers)
- **Immediate Incentive**: Get cashback on every purchase
- **Encourages Repeat Purchases**: Users are motivated to buy more
- **Transparent Rewards**: Clear percentage-based cashback system

### For Business
- **Increased Sales**: Self-commission incentivizes purchases
- **User Retention**: Buyers feel rewarded for their loyalty
- **Flexible Pricing Strategy**: Different products can have different cashback rates
- **Competitive Advantage**: Cashback system differentiates from competitors

## Testing

### Run Self-Commission Test
```bash
cd khabra-backend
node src/scripts/testSelfCommission.js
```

This test creates:
- A test user
- Multiple products with different self-commission rates
- An order with multiple products
- Verifies correct self-commission calculation and distribution

### Expected Test Results
- Product A (₹1000 × 2 qty × 5%) = ₹100 self-commission
- Product B (₹2000 × 1 qty × 3%) = ₹60 self-commission  
- Product C (₹1500 × 1 qty × 0%) = ₹0 self-commission
- **Total Self-Commission**: ₹160

## Duplicate Prevention

The self-commission system includes the same robust duplicate prevention as the MLM system:
- Checks if self-commission already distributed for an order
- Prevents multiple distributions for the same order
- Maintains data integrity

## Database Queries

### Check Self-Commission Earnings
```javascript
// Get all self-commission earnings for a user
db.earnings.find({ user: ObjectId("userId"), type: "self_commission" })

// Get self-commission earnings for an order
db.earnings.find({ orderId: ObjectId("orderId"), type: "self_commission" })

// Calculate total self-commission for a user
db.earnings.aggregate([
  { $match: { user: ObjectId("userId"), type: "self_commission" } },
  { $group: { _id: null, total: { $sum: "$amount" } } }
])
```

### Check Product Self-Commission Rates
```javascript
// Get products with self-commission
db.products.find({ selfCommission: { $gt: 0 } })

// Get products by self-commission range
db.products.find({ selfCommission: { $gte: 3, $lte: 10 } })
```

## API Integration

The self-commission feature is automatically integrated into existing endpoints:
- When order status changes to 'delivered' → `distributeAllCommissions()` is called
- Self-commission is distributed first, then MLM and franchise commissions
- All commission types are tracked in the same order document

## Future Enhancements

### Potential Improvements
1. **Tiered Self-Commission**: Higher rates for frequent buyers
2. **Category-Based Rates**: Different rates for different product categories
3. **Time-Limited Offers**: Temporary increased self-commission rates
4. **Minimum Order Self-Commission**: Higher rates for larger orders
5. **Self-Commission Analytics**: Dashboard showing self-commission impact on sales

## Monitoring

### Key Metrics to Track
- Total self-commission distributed per day/month
- Average self-commission per order
- Products with highest self-commission earnings
- User engagement after self-commission implementation
- Impact on repeat purchase rates

## Conclusion

The Self-Commission feature enhances the MLM system by providing immediate value to buyers, encouraging purchases, and maintaining the integrity of the existing commission structure. The feature is fully integrated, well-tested, and ready for production use.

**Total Commission Structure Now**:
- **Self-Commission**: Variable % (per product, to buyer)
- **MLM Commission**: 4% total (5 levels, to uplines)  
- **Franchise Commission**: Variable % (to franchise owner)

This creates a win-win-win scenario for buyers, uplines, and the business.
