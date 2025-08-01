# MLM System with Franchise Management - Backend Documentation

## Overview

This is a comprehensive MERN stack backend for an MLM (Multi-Level Marketing) system with franchise management capabilities. The system supports franchise owners, distributors, and administrators with full commission tracking and order management.

## Features

### 🏢 Franchise Management
- **Franchise Owners** can create offline orders for their region
- **Franchise Owners** can add people as their downline (distributors)
- **Admin** can track downline members for each franchise
- **Admin** can view total sales split by online & offline orders
- **Admin** can view detailed franchise information and order history

### 💰 Commission System
- **MLM Tree Commission**: 5-level commission structure (1.5%, 1.0%, 0.7%, 0.5%, 0.3%)
- **Franchise Commission**: Configurable percentage per franchise
- **Automatic Distribution**: Commissions are calculated and distributed when orders are marked as delivered

### 📊 Order Management
- **Online Orders**: Regular e-commerce orders
- **Offline Orders**: Orders created by franchise owners
- **Order Tracking**: Full order lifecycle management
- **Commission Tracking**: Detailed commission records per order

## Data Models

### User Model
```javascript
{
  _id: ObjectId,
  name: String,
  email: String,
  password: String,
  phone: String,
  role: 'admin' | 'franchise_owner' | 'distributor' | 'user',
  franchiseId: ObjectId (ref: Franchise),
  uplineId: ObjectId (ref: User),
  referralCode: String,
  referredBy: String,
  wallet: {
    balance: Number,
    transactions: [ObjectId]
  },
  network: {
    level1: [ObjectId],
    level2: [ObjectId],
    level3: [ObjectId]
  },
  franchiseOwner: {
    totalDownline: Number,
    totalSales: Number,
    commissionEarned: Number
  }
}
```

### Franchise Model
```javascript
{
  _id: ObjectId,
  name: String,
  location: String,
  district: String,
  address: String,
  contactPerson: String,
  phone: String,
  email: String,
  status: 'active' | 'inactive',
  ownerId: ObjectId (ref: User),
  commissionPercentage: Number,
  totalSales: {
    online: Number,
    offline: Number,
    total: Number
  },
  totalDownline: Number,
  totalCommission: Number
}
```

### Order Model
```javascript
{
  _id: ObjectId,
  user: ObjectId (ref: User),
  items: [{
    product: ObjectId (ref: Product),
    productName: String,
    productPrice: Number,
    productImage: String,
    quantity: Number
  }],
  totalAmount: Number,
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned',
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded',
  franchise: ObjectId (ref: Franchise),
  orderType: 'online' | 'offline',
  createdBy: ObjectId (ref: User),
  commissions: {
    mlm: [{
      userId: ObjectId,
      level: Number,
      amount: Number,
      status: 'pending' | 'paid'
    }],
    franchise: {
      franchiseId: ObjectId,
      amount: Number,
      percentage: Number,
      status: 'pending' | 'paid'
    }
  }
}
```

## API Endpoints

### Admin Endpoints

#### Franchise Management
- `GET /api/v1/franchises` - Get all franchises
- `POST /api/v1/franchises` - Create new franchise
- `PUT /api/v1/franchises/:id` - Update franchise
- `DELETE /api/v1/franchises/:id` - Delete franchise
- `GET /api/v1/franchises/admin/overview` - Get franchise overview with sales and downline
- `GET /api/v1/franchises/admin/statistics` - Get franchise statistics
- `GET /api/v1/franchises/:id/details` - Get detailed franchise information

#### Order Management
- `GET /api/orders/admin/all` - Get all orders
- `POST /api/orders/admin/create` - Create admin order
- `PUT /api/orders/:id/status` - Update order status
- `GET /api/orders/admin/total-sales` - Get total product sales

### Franchise Owner Endpoints

#### Sales & Orders
- `GET /api/v1/franchises/my/sales` - Get franchise sales and commission
- `POST /api/v1/franchises/orders` - Create offline order
- `POST /api/v1/franchises/downline` - Add downline member

### Public Endpoints
- `GET /api/v1/franchises/district/:district` - Get franchises by district

## Commission System

### MLM Commission Structure
```javascript
const MLM_COMMISSION_LEVELS = [
  { level: 1, percentage: 0.015 }, // 1.5%
  { level: 2, percentage: 0.01 },  // 1.0%
  { level: 3, percentage: 0.007 }, // 0.7%
  { level: 4, percentage: 0.005 }, // 0.5%
  { level: 5, percentage: 0.003 }  // 0.3%
];
```

### Commission Distribution
1. **MLM Commissions**: Distributed up to 5 levels using uplineId chain
2. **Franchise Commissions**: Calculated based on franchise's commission percentage
3. **Trigger**: Commissions are distributed when order status changes to 'delivered'

### Commission Calculation Example
```javascript
// For a ₹1000 order from a franchise with 10% commission
// MLM Commissions:
// Level 1: ₹1000 × 1.5% = ₹15
// Level 2: ₹1000 × 1.0% = ₹10
// Level 3: ₹1000 × 0.7% = ₹7
// Level 4: ₹1000 × 0.5% = ₹5
// Level 5: ₹1000 × 0.3% = ₹3

// Franchise Commission:
// Franchise: ₹1000 × 10% = ₹100
```

## Usage Examples

### Creating a Franchise Order
```javascript
// Franchise owner creates offline order
const orderData = {
  userId: "user_id",
  items: [{
    productName: "Product Name",
    productPrice: 100,
    productImage: "image_url",
    quantity: 2
  }],
  shippingAddress: { /* address details */ },
  billingAddress: { /* address details */ },
  paymentMethod: "cod",
  status: "delivered" // Will trigger commission distribution
};

const response = await franchiseAPI.createFranchiseOrder(orderData);
```

### Adding Downline Member
```javascript
// Franchise owner adds distributor
const memberData = {
  name: "John Doe",
  email: "john@example.com",
  phone: "1234567890",
  role: "distributor",
  uplineId: "franchise_owner_id" // Optional, defaults to franchise owner
};

const response = await franchiseAPI.addDownlineMember(memberData);
```

### Getting Franchise Overview (Admin)
```javascript
// Admin gets franchise overview
const overview = await franchiseAPI.getFranchiseOverview();
// Returns: franchises with sales, downline count, recent orders
```

## Authentication & Authorization

### JWT Authentication
- All protected routes require valid JWT token
- Token includes user role and ID

### Role-Based Access Control
- **Admin**: Full access to all endpoints
- **Franchise Owner**: Access to franchise-specific endpoints
- **Distributor/User**: Limited access based on role

### Middleware
- `protect`: Verifies JWT token
- `requireRole`: Checks user role for specific endpoints

## Database Indexes

### Performance Optimizations
```javascript
// User indexes
userSchema.index({ email: 1 });
userSchema.index({ franchiseId: 1 });
userSchema.index({ uplineId: 1 });

// Franchise indexes
franchiseSchema.index({ ownerId: 1 });
franchiseSchema.index({ district: 1 });
franchiseSchema.index({ status: 1 });

// Order indexes
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ franchise: 1 });
orderSchema.index({ orderType: 1 });
orderSchema.index({ status: 1 });
```

## Error Handling

### Standard Error Response
```javascript
{
  success: false,
  message: "Error description",
  error: "Detailed error information"
}
```

### Common Error Codes
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (invalid token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found (resource not found)
- `500`: Internal Server Error

## Environment Variables

```env
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://localhost:27017/mlm_system
JWT_SECRET=your_jwt_secret
JWT_EXPIRE=30d
```

## Installation & Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Set Environment Variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

4. **Start Production Server**
   ```bash
   npm start
   ```

## Testing

### API Testing
```bash
# Test franchise endpoints
curl -X GET http://localhost:5000/api/v1/franchises \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Test order creation
curl -X POST http://localhost:5000/api/v1/franchises/orders \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId": "user_id", "items": [...]}'
```

## Security Considerations

1. **Password Hashing**: All passwords are hashed using bcrypt
2. **JWT Security**: Tokens expire and are validated on each request
3. **Input Validation**: All inputs are validated using Mongoose schemas
4. **Role-Based Access**: Strict role-based access control
5. **SQL Injection Protection**: Using Mongoose ODM prevents SQL injection

## Performance Considerations

1. **Database Indexing**: Strategic indexes for common queries
2. **Aggregation Optimization**: Efficient MongoDB aggregations for reports
3. **Pagination**: Large datasets are paginated
4. **Caching**: Consider implementing Redis for frequently accessed data

## Future Enhancements

1. **Real-time Notifications**: WebSocket integration for live updates
2. **Advanced Analytics**: More detailed reporting and analytics
3. **Mobile API**: Optimized endpoints for mobile applications
4. **Payment Integration**: Direct payment gateway integration
5. **Inventory Management**: Product stock tracking and management

## Support

For questions or issues, please refer to the API documentation or contact the development team. 