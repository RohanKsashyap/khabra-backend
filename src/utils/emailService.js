const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config(); // Load environment variables

// Create reusable transporter object using SMTP transport
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587', 10), // Ensure port is a number
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  // Add tls options if needed, depending on your SMTP server
  // tls: {
  //   rejectUnauthorized: false
  // }
});

// Format currency
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD' // Or your desired currency
  }).format(amount);
};

// Format date
const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Generate order status email content
const generateOrderStatusEmail = (data) => {
  const {
    orderId,
    status,
    items,
    totalAmount,
    trackingNumber,
    carrier,
    estimatedDelivery,
    trackingUpdate,
    returnReason,
    returnNotes,
    userEmail // Assuming user email is passed in data
  } = data;

  let subject = '';
  let content = '';

  switch (status) {
    case 'pending':
      subject = `Order #${orderId} Confirmation`;
      content = `
        <h2>Thank you for your order!</h2>
        <p>Your order #${orderId} has been received and is being processed.</p>
        <h3>Order Details:</h3>
        <ul>
          ${items.map((item) => `
            <li>${item.productName} x ${item.quantity} - ${formatCurrency(item.price * item.quantity)}</li>
          `).join('')}
        </ul>
        <p><strong>Total Amount:</strong> ${formatCurrency(totalAmount)}</p>
        <p><a href="${process.env.FRONTEND_URL}/orders/${orderId}">View your order details</a></p>
      `;
      break;

    case 'processing':
      subject = `Order #${orderId} Processing Update`;
      content = `
        <h2>Your order is being processed</h2>
        <p>Order #${orderId} is now being processed and will be shipped soon.</p>
        <p><a href="${process.env.FRONTEND_URL}/orders/${orderId}">View your order details</a></p>
      `;
      break;

    case 'shipped':
      subject = `Order #${orderId} Shipped`;
      content = `
        <h2>Your order has been shipped!</h2>
        <p>Order #${orderId} has been shipped via ${carrier}.</p>
        ${trackingNumber ? `<p><strong>Tracking Number:</strong> ${trackingNumber}</p>` : ''}
        ${estimatedDelivery ? `<p><strong>Estimated Delivery:</strong> ${formatDate(estimatedDelivery)}</p>` : ''}
        <p><a href="${process.env.FRONTEND_URL}/orders/${orderId}">Track your order</a></p>
      `;
      break;

    case 'delivered':
      subject = `Order #${orderId} Delivered`;
      content = `
        <h2>Your order has been delivered!</h2>
        <p>Order #${orderId} has been successfully delivered.</p>
        <p>Thank you for shopping with us!</p>
        <p><a href="${process.env.FRONTEND_URL}/orders/${orderId}">View your order details</a></p>
      `;
      break;

    case 'cancelled':
      subject = `Order #${orderId} Cancelled`;
      content = `
        <h2>Order Cancelled</h2>
        <p>Your order #${orderId} has been cancelled.</p>
        <p>If you have any questions, please contact our customer service.</p>
        <p><a href="${process.env.FRONTEND_URL}/orders/${orderId}">View your order details</a></p>
      `;
      break;

    case 'return_requested':
      subject = `Return Request for Order #${orderId} Received`;
      content = `
        <h2>Return Request Received</h2>
        <p>We have received your return request for order #${orderId}.</p>
        <p><strong>Reason:</strong> ${returnReason}</p>
        <p>We will review your request and get back to you soon.</p>
        <p><a href="${process.env.FRONTEND_URL}/orders/${orderId}">View your order details</a></p>
      `;
      break;

    case 'return_approved':
      subject = `Return Request for Order #${orderId} Approved`;
      content = `
        <h2>Return Request Approved</h2>
        <p>Your return request for order #${orderId} has been approved.</p>
        ${returnNotes ? `<p><strong>Notes:</strong> ${returnNotes}</p>` : ''}
        <p>Please follow the return instructions provided in your order details.</p>
        <p><a href="${process.env.FRONTEND_URL}/orders/${orderId}">View your order details</a></p>
      `;
      break;

    case 'return_rejected':
      subject = `Return Request for Order #${orderId} Rejected`;
      content = `
        <h2>Return Request Rejected</h2>
        <p>Your return request for order #${orderId} has been rejected.</p>
        ${returnNotes ? `<p><strong>Reason:</strong> ${returnNotes}</p>` : ''}
        <p>If you have any questions, please contact our customer service.</p>
        <p><a href="${process.env.FRONTEND_URL}/orders/${orderId}">View your order details</a></p>
      `;
      break;

    case 'return_completed':
      subject = `Return Process Completed for Order #${orderId}`;
      content = `
        <h2>Return Process Completed</h2>
        <p>The return process for order #${orderId} has been completed.</p>
        <p>Your refund has been processed.</p>
        ${returnNotes ? `<p><strong>Notes:</strong> ${returnNotes}</p>` : ''}
        <p><a href="${process.env.FRONTEND_URL}/orders/${orderId}">View your order details</a></p>
      `;
      break;

    case 'tracking_update': // New case for general tracking updates
      subject = `Tracking Update for Order #${orderId}`;
      content = `
        <h2>Order Tracking Update</h2>
        <p>There is an update for your order #${orderId}.</p>
        <p><strong>Status:</strong> ${trackingUpdate.status}</p>
        ${trackingUpdate.location ? `<p><strong>Location:</strong> ${trackingUpdate.location}</p>` : ''}
        ${trackingUpdate.description ? `<p><strong>Description:</strong> ${trackingUpdate.description}</p>` : ''}
        <p><strong>Time:</strong> ${formatDate(trackingUpdate.timestamp)}</p>
        <p><a href="${process.env.FRONTEND_URL}/orders/${orderId}">Track your order</a></p>
      `;
      break;

    default:
      // Handle other statuses or no specific template
      subject = `Update for Order #${orderId}`;
      content = `
        <h2>Order Status Update</h2>
        <p>The status of your order #${orderId} has been updated to: ${status}.</p>
        <p><a href="${process.env.FRONTEND_URL}/orders/${orderId}">View your order details</a></p>
      `;
      break;
  }

  return { subject, content };
};

// Generate welcome email content
const generateWelcomeEmail = (data) => {
  const { userName, userEmail, loginUrl } = data;

  const subject = 'Welcome to Our E-commerce Platform!';
  const content = `
    <h2>Welcome, ${userName}!</h2>
    <p>Thank you for registering on our platform. We are excited to have you join our community.</p>
    <p>You can now explore our products and start shopping.</p>
    <p><a href="${loginUrl}">Login to your account</a></p>
  `;

  return { subject, content };
};

// Generate password reset email content
const generatePasswordResetEmail = (data) => {
  const { userName, resetLink } = data;

  const subject = 'Password Reset Request';
  const content = `
    <h2>Password Reset Request</h2>
    <p>Hello ${userName},</p>
    <p>You requested to reset your password. Click the link below to reset it:</p>
    <p><a href="${resetLink}">Reset your password</a></p>
    <p>This link will expire in a short time.</p>
    <p>If you did not request a password reset, please ignore this email.</p>
  `;

  return { subject, content };
};

// General function to send email notifications
exports.sendEmailNotification = async (to, type, data) => {
  try {
    let subject = '';
    let htmlContent = '';

    switch (type) {
      case 'orderStatus':
        const orderEmailData = generateOrderStatusEmail(data);
        subject = orderEmailData.subject;
        htmlContent = orderEmailData.content;
        break;
      case 'welcome':
        const welcomeEmailData = generateWelcomeEmail(data);
        subject = welcomeEmailData.subject;
        htmlContent = welcomeEmailData.content;
        break;
      case 'passwordReset':
        const passwordResetEmailData = generatePasswordResetEmail(data);
        subject = passwordResetEmailData.subject;
        htmlContent = passwordResetEmailData.content;
        break;
      // Add cases for other email types here
      default:
        console.error(`Unknown email type: ${type}`);
        return; // Don't send email for unknown types
    }

    // Basic HTML structure for the email body
    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #333;">NexGen MLM</h1>
        </div>
        ${htmlContent}
        <hr style="margin-top: 30px; margin-bottom: 20px; border: 0; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px; text-align: center;">
          This is an automated message, please do not reply to this email.
          If you have any questions, please contact our customer service.
        </p>
      </div>
    `;

    await transporter.sendMail({
      from: process.env.SMTP_FROM, // Sender address
      to: to, // List of receivers
      subject: subject, // Subject line
      html: emailBody, // html body
    });

    console.log(`Email sent successfully to ${to}`);

  } catch (error) {
    console.error('Error sending email:', error);
    // Don't throw error to prevent blocking the main process
  }
};

// For backward compatibility and existing uses in controllers
// Remove these exports once controllers are updated to use sendEmailNotification
exports.sendOrderStatusEmail = exports.sendEmailNotification; // Alias for now

// You might still need to export template functions if they are used directly elsewhere
// exports.generateOrderStatusEmail = generateOrderStatusEmail;
// exports.generateWelcomeEmail = generateWelcomeEmail;
// exports.generatePasswordResetEmail = generatePasswordResetEmail; 