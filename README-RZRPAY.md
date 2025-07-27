# Razorpay Integration Guide

This guide provides a step-by-step approach to implementing Razorpay payment gateway for e-commerce applications, covering order creation, payment status updates, and refund processing. The implementation is language-agnostic and can be adapted to any tech stack.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Order Creation Flow](#order-creation-flow)
4. [Payment Verification](#payment-verification)
5. [Webhook Integration](#webhook-integration)
6. [Refund Processing](#refund-processing)
7. [Error Handling](#error-handling)
8. [Database Schema](#database-schema)
9. [Security Best Practices](#security-best-practices)

## Prerequisites

- A Razorpay account with API access
- API key ID and secret from Razorpay dashboard
- Basic understanding of REST APIs
- Server with HTTPS support for webhooks

## Environment Setup

1. **Register for Razorpay Account**:
   - Create an account at [Razorpay](https://razorpay.com)
   - Navigate to Dashboard > Settings > API Keys
   - Generate and securely store your Key ID and Secret

2. **Environment Variables**:
   ```
   RAZORPAY_KEY_ID=your_key_id
   RAZORPAY_KEY_SECRET=your_key_secret
   RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
   ```

3. **Install Razorpay SDK**:
   - For Node.js: `npm install razorpay`
   - For Python: `pip install razorpay`
   - For PHP: `composer require razorpay/razorpay`
   - For other languages, check the [Razorpay documentation](https://razorpay.com/docs/)

## Order Creation Flow

### Backend Implementation

1. **Initialize Razorpay Client**:
   ```python
   # Python example
   import razorpay
   client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
   ```

2. **Calculate Order Amount**:
   ```python
   # Calculate total price (product price + delivery fee)
   total_price = calculate_product_total(items)
   delivery_fee = calculate_delivery_fee(total_price, postal_code)
   final_amount = total_price + delivery_fee
   ```

3. **Create Razorpay Order**:
   ```python
   # Convert amount to smallest currency unit (paise for INR)
   amount_in_paise = int(final_amount * 100)
   
   # Prepare order data
   razorpay_order_data = {
       'amount': amount_in_paise,
       'currency': 'INR',
       'receipt': f'order_{unique_id}',
       'notes': {
           'user_id': user_id,
           # Add any additional metadata
       }
   }
   
   # Create order in Razorpay
   razorpay_order = client.order.create(razorpay_order_data)
   
   # Store razorpay_order_id in your database
   order = create_order_in_database(
       user=current_user,
       items=items,
       total_price=final_amount,
       razorpay_order_id=razorpay_order['id']
   )
   ```

4. **Return Order Details to Frontend**:
   ```python
   # Return necessary information for checkout
   return {
       'order_id': order.id,
       'razorpay_order_id': razorpay_order['id'],
       'razorpay_key_id': RAZORPAY_KEY_ID,
       'amount': amount_in_paise,
       'currency': 'INR'
   }
   ```

### Frontend Implementation

1. **Include Razorpay Checkout Script**:
   ```html
   <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
   ```

2. **Initialize Razorpay Checkout**:
   ```javascript
   // After receiving order details from backend
   const options = {
     key: response.razorpay_key_id,
     amount: response.amount,
     currency: response.currency,
     name: "Your Store Name",
     description: "Order Payment",
     order_id: response.razorpay_order_id,
     handler: async function(response) {
       // Handle successful payment
       const verificationData = {
         razorpay_order_id: response.razorpay_order_id,
         razorpay_payment_id: response.razorpay_payment_id,
         razorpay_signature: response.razorpay_signature
       };
       
       // Verify payment on your server
       await verifyPayment(verificationData);
     },
     prefill: {
       name: user.name,
       contact: user.phone,
       email: user.email
     },
     theme: {
       color: "#3399cc"
     },
     modal: {
       ondismiss: function() {
         // Handle checkout modal dismissal
       }
     }
   };
   
   const rzp = new Razorpay(options);
   rzp.on('payment.failed', function(response) {
     // Handle payment failure
     console.error('Payment failed:', response.error);
   });
   rzp.open();
   ```

## Payment Verification

1. **Create Verification Endpoint**:
   ```python
   def verify_payment(request):
       # Get payment details from request
       razorpay_order_id = request.data.get('razorpay_order_id')
       razorpay_payment_id = request.data.get('razorpay_payment_id')
       razorpay_signature = request.data.get('razorpay_signature')
       
       # Validate required parameters
       if not all([razorpay_order_id, razorpay_payment_id, razorpay_signature]):
           return error_response("Missing required parameters")
       
       # Verify signature
       try:
           client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
           client.utility.verify_payment_signature({
               'razorpay_order_id': razorpay_order_id,
               'razorpay_payment_id': razorpay_payment_id,
               'razorpay_signature': razorpay_signature
           })
       except Exception as e:
           # Log the error
           logger.error(f"Signature verification failed: {str(e)}")
           return error_response("Invalid payment signature")
       
       # Update order status
       try:
           order = Order.objects.get(razorpay_order_id=razorpay_order_id)
           
           # Create or update payment record
           payment = Payment.objects.create_or_update(
               order=order,
               amount=order.total_price,
               payment_method='ONLINE',
               status='COMPLETED',
               razorpay_payment_id=razorpay_payment_id
           )
           
           # Update order status
           order.status = 'PROCESSING'
           order.payment_status = 'COMPLETED'
           order.save()
           
           return success_response("Payment verified successfully")
       except Order.DoesNotExist:
           return error_response("Order not found")
   ```

## Webhook Integration

1. **Configure Webhook in Razorpay Dashboard**:
   - Go to Dashboard > Settings > Webhooks
   - Add a new webhook with your endpoint URL
   - Select events: `payment.authorized`, `payment.captured`, `payment.failed`, `refund.created`, `refund.processed`, `refund.failed`
   - Generate and note down your webhook secret

2. **Create Webhook Endpoint**:
   ```python
   @csrf_exempt  # Disable CSRF for Razorpay webhook
   def payment_webhook(request):
       # Get webhook secret
       webhook_secret = os.getenv('RAZORPAY_WEBHOOK_SECRET')
       
       # Get webhook signature from headers
       webhook_signature = request.headers.get('X-Razorpay-Signature')
       
       # Verify webhook signature
       try:
           client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
           request_body = request.body.decode('utf-8')
           client.utility.verify_webhook_signature(
               request_body, 
               webhook_signature, 
               webhook_secret
           )
       except Exception as e:
           logger.error(f"Webhook signature verification failed: {str(e)}")
           return error_response("Invalid webhook signature")
       
       # Parse webhook payload
       payload = json.loads(request_body)
       event_type = payload.get('event')
       
       # Handle different event types
       if event_type.startswith('payment.'):
           return handle_payment_event(payload)
       elif event_type.startswith('refund.'):
           return handle_refund_event(payload)
       else:
           return success_response("Event acknowledged")
   ```

3. **Handle Payment Events**:
   ```python
   def handle_payment_event(payload):
       # Extract payment information
       payment_entity = payload['payload']['payment']['entity']
       razorpay_payment_id = payment_entity.get('id')
       razorpay_order_id = payment_entity.get('order_id')
       payment_status = payment_entity.get('status')
       
       # Find order by Razorpay order ID
       try:
           order = Order.objects.get(razorpay_order_id=razorpay_order_id)
       except Order.DoesNotExist:
           return error_response("Order not found")
       
       # Map Razorpay payment status to your system's status
       status_mapping = {
           'created': 'PENDING',
           'authorized': 'PROCESSING',
           'captured': 'COMPLETED',
           'refunded': 'REFUNDED',
           'failed': 'FAILED'
       }
       
       # Update payment status
       if payment_status in status_mapping:
           order.payment_status = status_mapping[payment_status]
           
           # Update payment details
           if hasattr(order, 'payment'):
               order.payment.razorpay_payment_id = razorpay_payment_id
               order.payment.status = status_mapping[payment_status]
               order.payment.save()
           
           # Update order status based on payment status
           if payment_status == 'captured':
               order.status = 'PROCESSING'
           elif payment_status == 'failed':
               order.status = 'PAYMENT_FAILED'
           
           order.save()
           
           return success_response("Payment status updated")
       else:
           return error_response("Unknown payment status")
   ```

## Razorpay Webhook Responses

Razorpay sends webhook notifications for various events. Each webhook payload follows a specific structure based on the event type. Here are the expected responses for key webhook events:

### 1. Payment Events

#### `payment.authorized`
Triggered when a payment is authorized but not yet captured.

```json
{
  "entity": "event",
  "account_id": "acc_XXXXXXXXXX",
  "event": "payment.authorized",
  "contains": ["payment"],
  "payload": {
    "payment": {
      "entity": {
        "id": "pay_XXXXXXXXXX",
        "entity": "payment",
        "amount": 50000,
        "currency": "INR",
        "status": "authorized",
        "order_id": "order_XXXXXXXXXX",
        "method": "netbanking",
        "bank": "HDFC",
        "amount_refunded": 0,
        "refund_status": null,
        "captured": false,
        "description": "Order Payment",
        "notes": {
          "user_id": "user_123"
        },
        "created_at": 1597845148
      }
    }
  },
  "created_at": 1597845148
}
```

#### `payment.captured`
Triggered when a payment is successfully captured.

```json
{
  "entity": "event",
  "account_id": "acc_XXXXXXXXXX",
  "event": "payment.captured",
  "contains": ["payment"],
  "payload": {
    "payment": {
      "entity": {
        "id": "pay_XXXXXXXXXX",
        "entity": "payment",
        "amount": 50000,
        "currency": "INR",
        "status": "captured",
        "order_id": "order_XXXXXXXXXX",
        "method": "card",
        "card_id": "card_XXXXXXXXXX",
        "amount_refunded": 0,
        "refund_status": null,
        "captured": true,
        "description": "Order Payment",
        "notes": {
          "user_id": "user_123"
        },
        "created_at": 1597845148
      }
    }
  },
  "created_at": 1597845148
}
```

#### `payment.failed`
Triggered when a payment fails.

```json
{
  "entity": "event",
  "account_id": "acc_XXXXXXXXXX",
  "event": "payment.failed",
  "contains": ["payment"],
  "payload": {
    "payment": {
      "entity": {
        "id": "pay_XXXXXXXXXX",
        "entity": "payment",
        "amount": 50000,
        "currency": "INR",
        "status": "failed",
        "order_id": "order_XXXXXXXXXX",
        "method": "upi",
        "amount_refunded": 0,
        "refund_status": null,
        "captured": false,
        "description": "Order Payment",
        "notes": {
          "user_id": "user_123"
        },
        "error_code": "BAD_REQUEST_ERROR",
        "error_description": "Payment authentication failed",
        "created_at": 1597845148
      }
    }
  },
  "created_at": 1597845148
}
```

### 2. Refund Events

#### `refund.created`
Triggered when a refund is initiated.

```json
{
  "entity": "event",
  "account_id": "acc_XXXXXXXXXX",
  "event": "refund.created",
  "contains": ["refund"],
  "payload": {
    "refund": {
      "entity": {
        "id": "rfnd_XXXXXXXXXX",
        "entity": "refund",
        "amount": 50000,
        "currency": "INR",
        "payment_id": "pay_XXXXXXXXXX",
        "notes": {
          "order_id": "order_123",
          "reason": "Customer requested refund"
        },
        "receipt": null,
        "acquirer_data": {
          "arn": null
        },
        "created_at": 1597845148,
        "batch_id": null,
        "status": "initiated",
        "speed_processed": "normal",
        "speed_requested": "normal"
      }
    }
  },
  "created_at": 1597845148
}
```

#### `refund.processed`
Triggered when a refund is successfully processed.

```json
{
  "entity": "event",
  "account_id": "acc_XXXXXXXXXX",
  "event": "refund.processed",
  "contains": ["refund"],
  "payload": {
    "refund": {
      "entity": {
        "id": "rfnd_XXXXXXXXXX",
        "entity": "refund",
        "amount": 50000,
        "currency": "INR",
        "payment_id": "pay_XXXXXXXXXX",
        "notes": {
          "order_id": "order_123",
          "reason": "Customer requested refund"
        },
        "receipt": null,
        "acquirer_data": {
          "arn": "10000000000000"
        },
        "created_at": 1597845148,
        "processed_at": 1597845248,
        "batch_id": "batch_XXXXXXXXXX",
        "status": "processed",
        "speed_processed": "normal",
        "speed_requested": "normal"
      }
    }
  },
  "created_at": 1597845248
}
```

#### `refund.failed`
Triggered when a refund fails.

```json
{
  "entity": "event",
  "account_id": "acc_XXXXXXXXXX",
  "event": "refund.failed",
  "contains": ["refund"],
  "payload": {
    "refund": {
      "entity": {
        "id": "rfnd_XXXXXXXXXX",
        "entity": "refund",
        "amount": 50000,
        "currency": "INR",
        "payment_id": "pay_XXXXXXXXXX",
        "notes": {
          "order_id": "order_123",
          "reason": "Customer requested refund"
        },
        "receipt": null,
        "acquirer_data": {
          "arn": null
        },
        "created_at": 1597845148,
        "batch_id": null,
        "status": "failed",
        "speed_processed": "normal",
        "speed_requested": "normal",
        "error": {
          "code": "GATEWAY_ERROR",
          "description": "Gateway error"
        }
      }
    }
  },
  "created_at": 1597845248
}
```

### 3. Expected Response to Razorpay

Your webhook endpoint should respond to Razorpay with a proper HTTP status code:

- **200 OK**: Indicates that your server successfully processed the webhook
- **4XX Error**: Indicates that there was an issue with the webhook request
- **5XX Error**: Indicates that your server encountered an error while processing the webhook

The response body should be a JSON object with at least a status field:

```json
{
  "status": "success",
  "message": "Webhook processed successfully"
}
```

Or for errors:

```json
{
  "status": "error",
  "message": "Error processing webhook: Invalid signature"
}
```

### 4. Webhook Retry Mechanism

Razorpay automatically retries failed webhook deliveries with an exponential backoff:
- First retry: 5 minutes after the initial failure
- Second retry: 15 minutes after the first retry
- Third retry: 45 minutes after the second retry
- Fourth retry: 2 hours after the third retry
- Fifth retry: 5 hours after the fourth retry

After 5 unsuccessful retries, Razorpay stops attempting to deliver the webhook. It's important to ensure your webhook endpoint is reliable and can handle temporary failures.

## Refund Processing

1. **Initiate Refund**:
   ```python
   def process_refund(order_id, refund_amount=None, refund_reason="Customer requested refund"):
       try:
           # Get order
           order = Order.objects.get(id=order_id)
           
           # Validate order status
           if order.status not in ['DELIVERED', 'SHIPPED', 'PROCESSING']:
               return error_response("Order cannot be refunded at this stage")
           
           # Validate payment status
           if not order.payment or order.payment.status != 'COMPLETED':
               return error_response("Order payment is not eligible for refund")
           
           # Use full amount if refund_amount not specified
           if refund_amount is None:
               refund_amount = order.total_price
           
           # Validate refund amount
           if refund_amount <= 0 or refund_amount > order.total_price:
               return error_response("Invalid refund amount")
           
           # Initialize Razorpay client
           client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
           
           # Check if payment has Razorpay ID
           if not order.payment.razorpay_payment_id:
               return error_response("No Razorpay payment ID found")
           
           # Process refund through Razorpay
           refund_data = {
               "amount": int(refund_amount * 100),  # Convert to paise
               "speed": "normal",
               "notes": {
                   "order_id": order.order_number,
                   "reason": refund_reason
               }
           }
           
           # Initiate refund
           razorpay_refund = client.payment.refund(
               order.payment.razorpay_payment_id, 
               refund_data
           )
           
           # Create refund record
           refund = Refund.objects.create(
               order=order,
               payment=order.payment,
               amount=refund_amount,
               reason=refund_reason,
               status='PROCESSING',
               razorpay_refund_id=razorpay_refund.get('id')
           )
           
           # Update order status
           if refund_amount == order.total_price:
               order.payment_status = 'REFUNDED'
               order.status = 'REFUNDED'
           else:
               order.payment_status = 'PARTIALLY_REFUNDED'
           
           order.save()
           
           return success_response("Refund initiated successfully", refund)
       except Order.DoesNotExist:
           return error_response("Order not found")
       except Exception as e:
           logger.error(f"Refund error: {str(e)}")
           return error_response(f"Failed to process refund: {str(e)}")
   ```

2. **Handle Refund Events**:
   ```python
   def handle_refund_event(payload):
       # Extract refund information
       refund_entity = payload['payload']['refund']['entity']
       razorpay_refund_id = refund_entity.get('id')
       razorpay_payment_id = refund_entity.get('payment_id')
       refund_amount = refund_entity.get('amount', 0) / 100  # Convert from paise
       refund_status = refund_entity.get('status')
       event_type = payload.get('event')
       
       # Find payment by Razorpay payment ID
       try:
           payment = Payment.objects.get(razorpay_payment_id=razorpay_payment_id)
           order = Order.objects.filter(payment=payment).first()
           
           if not order:
               return error_response("Order not found")
       except Payment.DoesNotExist:
           return error_response("Payment not found")
       
       # Handle different refund events
       if event_type == 'refund.created':
           # Update or create refund record with PENDING status
           refund = Refund.objects.filter(razorpay_refund_id=razorpay_refund_id).first()
           if refund:
               refund.status = 'PENDING'
               refund.save()
           else:
               Refund.objects.create(
                   order=order,
                   payment=payment,
                   amount=refund_amount,
                   reason="Refund initiated via Razorpay",
                   status='PENDING',
                   razorpay_refund_id=razorpay_refund_id
               )
           
           return success_response("Refund creation acknowledged")
           
       elif event_type == 'refund.processed':
           # Update order payment status
           if refund_amount < float(order.total_price):
               order.payment_status = 'PARTIALLY_REFUNDED'
           else:
               order.payment_status = 'REFUNDED'
               order.status = 'REFUNDED'
           
           order.save()
           
           # Update payment record
           payment.status = 'REFUNDED'
           payment.save()
           
           # Update refund record
           refund = Refund.objects.filter(razorpay_refund_id=razorpay_refund_id).first()
           if refund:
               refund.status = 'COMPLETED'
               refund.save()
           else:
               Refund.objects.create(
                   order=order,
                   payment=payment,
                   amount=refund_amount,
                   reason="Refund processed via Razorpay",
                   status='COMPLETED',
                   razorpay_refund_id=razorpay_refund_id
               )
           
           return success_response("Refund processed successfully")
           
       elif event_type == 'refund.failed':
           # Update refund record
           refund = Refund.objects.filter(razorpay_refund_id=razorpay_refund_id).first()
           if refund:
               refund.status = 'FAILED'
               refund.save()
           else:
               Refund.objects.create(
                   order=order,
                   payment=payment,
                   amount=refund_amount,
                   reason="Refund failed via Razorpay",
                   status='FAILED',
                   razorpay_refund_id=razorpay_refund_id
               )
           
           return success_response("Refund failure acknowledged")
       
       return success_response("Refund event processed")
   ```

## Error Handling

1. **Common Error Scenarios**:
   - Order creation failure
   - Payment verification failure
   - Webhook signature verification failure
   - Refund processing failure

2. **Best Practices**:
   - Log detailed error information
   - Return appropriate HTTP status codes
   - Provide clear error messages to users
   - Implement retry mechanisms for transient failures
   - Set up monitoring and alerts for payment failures

## Database Schema

Implement these key models to track orders, payments, and refunds:

1. **Order Model**:
   ```
   - id: Primary key
   - user_id: Foreign key to user
   - order_number: Unique order identifier
   - status: Order status (PENDING, PROCESSING, SHIPPED, DELIVERED, etc.)
   - payment_status: Payment status (PENDING, COMPLETED, FAILED, REFUNDED)
   - total_price: Total order amount
   - shipping_cost: Delivery fee
   - razorpay_order_id: Razorpay order ID
   - created_at: Timestamp
   - updated_at: Timestamp
   ```

2. **Payment Model**:
   ```
   - id: Primary key
   - order_id: Foreign key to order
   - amount: Payment amount
   - payment_method: Payment method (CREDIT_CARD, DEBIT_CARD, UPI, etc.)
   - transaction_id: Unique transaction identifier
   - status: Payment status (PENDING, COMPLETED, FAILED, REFUNDED)
   - razorpay_payment_id: Razorpay payment ID
   - created_at: Timestamp
   ```

3. **Refund Model**:
   ```
   - id: Primary key
   - order_id: Foreign key to order
   - payment_id: Foreign key to payment
   - amount: Refund amount
   - reason: Refund reason
   - status: Refund status (PENDING, PROCESSING, COMPLETED, FAILED)
   - razorpay_refund_id: Razorpay refund ID
   - requested_by: User who requested the refund
   - processed_by: User who processed the refund
   - created_at: Timestamp
   - updated_at: Timestamp
   ```

## Security Best Practices

1. **API Key Security**:
   - Never expose Razorpay API keys in frontend code
   - Store API keys in environment variables
   - Use different keys for development and production

2. **Webhook Security**:
   - Always verify webhook signatures
   - Use HTTPS for webhook endpoints
   - Set up IP whitelisting if possible

3. **Payment Verification**:
   - Always verify payment signatures
   - Don't trust client-side payment confirmations
   - Implement idempotency to prevent duplicate processing

4. **Data Protection**:
   - Encrypt sensitive payment data
   - Implement proper access controls
   - Follow PCI DSS guidelines if storing card information

5. **Monitoring and Alerts**:
   - Set up monitoring for payment failures
   - Create alerts for unusual payment patterns
   - Regularly audit payment and refund logs

---

This guide provides a foundation for implementing Razorpay integration in any application. Adapt the code examples to your specific programming language and framework while maintaining the core flow and security practices. 