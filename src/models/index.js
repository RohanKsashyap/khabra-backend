module.exports = {
  // Existing models
  Address: require('./Address'),
  Cart: require('./Cart'),
  Contact: require('./Contact'),
  Earning: require('./Earning'),
  Franchise: require('./Franchise'),
  MLMCommissionConfig: require('./MLMCommissionConfig'),
  Network: require('./Network'),
  Notification: require('./Notification'),
  Order: require('./Order'),
  Payment: require('./Payment'),
  Product: require('./Product'),
  Rank: require('./Rank'),
  ReturnRequest: require('./ReturnRequest'),
  Review: require('./Review'),
  User: require('./User'),
  UserRank: require('./UserRank'),
  WithdrawalRequest: require('./WithdrawalRequest'),

  // New Inventory Models
  Stock: require('./Stock'),
  StockMovement: require('./StockMovement'),
  InventoryAudit: require('./InventoryAudit'),
  AuditItem: require('./AuditItem')
}; 