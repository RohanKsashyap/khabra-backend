# Razorpay Integration Guide for KHABRA-MLM

This guide explains how Razorpay payment gateway has been integrated into the KHABRA-MLM application.

## Setup Instructions

1. **Environment Variables**

   Add the following environment variables to your `.env` file:

   ```
   RAZORPAY_KEY_ID=your_razorpay_key_id
   RAZORPAY_KEY_SECRET=your_razorpay_key_secret
   RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret
   ```

   You can obtain these credentials from your Razorpay dashboard.

2. **Webhook Configuration**

   - Go to your Razorpay Dashboard > Settings > Webhooks
   - Add a new webhook with your endpoint URL: `https://your-domain.com/api/payments/webhook`
   - Select events: `payment.authorized`, `payment.captured`, `payment.failed`, `refund.created`, `refund.processed`, `refund.failed`
   - Generate and save your webhook secret

## API Endpoints

### Backend Endpoints

1. **Create Razorpay Order**
   - **URL**: `/api/payments/razorpay/create`
   - **Method**: `POST`
   - **Auth**: Required
   - **Body**: `{ orderId: "your_order_id" }`
   - **Response**: Razorpay order details

2. **Verify Payment**
   - **URL**: `/api/payments/razorpay/verify`
   - **Method**: `POST`
   - **Auth**: Required
   - **Body**: `{ razorpayOrderId, razorpayPaymentId, razorpaySignature }`
   - **Response**: Payment verification status

3. **Webhook Handler**
   - **URL**: `/api/payments/webhook`
   - **Method**: `POST`
   - **Auth**: None (uses Razorpay signature for verification)
   - **Body**: Webhook payload from Razorpay
   - **Response**: Webhook processing status

4. **Process Refund**
   - **URL**: `/api/payments/refund`
   - **Method**: `POST`
   - **Auth**: Admin only
   - **Body**: `{ orderId, amount, notes }`
   - **Response**: Refund processing status

## Implementation Details

### Backend Components

1. **Configuration**
   - `config/razorpay.js`: Initializes Razorpay client with API keys

2. **Models**
   - `models/Payment.js`: Schema for storing payment information
   - `models/Order.js`: Updated to support Razorpay payment method

3. **Controllers**
   - `controllers/paymentController.js`: Handles payment operations

4. **Routes**
   - `routes/paymentRoutes.js`: Defines API endpoints for payment operations

### Frontend Components

1. **Utilities**
   - `utils/razorpay.ts`: Helper functions for Razorpay integration

2. **Components**
   - `components/payment/RazorpayCheckout.tsx`: Razorpay checkout button component

3. **Pages**
   - `pages/CheckoutPage.tsx`: Updated to include Razorpay payment option

## Payment Flow

1. User selects products and proceeds to checkout
2. User selects Razorpay as the payment method
3. User completes the checkout form and submits
4. Backend creates an order in the database
5. Backend creates a Razorpay order
6. Frontend displays Razorpay checkout modal
7. User completes payment in the Razorpay modal
8. Razorpay sends payment verification data to frontend
9. Frontend sends verification data to backend
10. Backend verifies the payment signature
11. Backend updates order status
12. User is redirected to success page

## Webhook Flow

1. Razorpay sends webhook events to the configured endpoint
2. Backend verifies the webhook signature
3. Backend processes the event based on its type
4. Backend updates payment and order status accordingly

## Refund Flow

1. Admin initiates refund from admin panel
2. Backend sends refund request to Razorpay
3. Razorpay processes the refund
4. Razorpay sends webhook event for refund status
5. Backend updates refund status based on webhook

## Testing

1. Use Razorpay test mode for development
2. Test cards are available in the [Razorpay documentation](https://razorpay.com/docs/payments/payments/test-card-details/)
3. For webhook testing, use tools like ngrok to expose your local server

## Troubleshooting

1. **Payment Failed**
   - Check Razorpay dashboard for error details
   - Verify API keys are correct
   - Ensure proper error handling in frontend and backend

2. **Webhook Issues**
   - Verify webhook URL is accessible
   - Check webhook secret is correctly configured
   - Review server logs for webhook processing errors

3. **Refund Problems**
   - Ensure the payment is eligible for refund
   - Check refund amount is valid
   - Verify admin permissions 