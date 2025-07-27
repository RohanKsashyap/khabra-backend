How the inventory system works in this application. The system is quite comprehensive and consists of several key components:

1. **Stock Management (`Stock` model)**
   - Each stock entry is associated with a specific product and franchise location
   - Tracks:
     - Current quantity
     - Minimum threshold (for reorder alerts)
     - Maximum capacity (storage limit)
     - Last updated timestamp
   - Includes validation to ensure:
     - Quantity cannot exceed maximum capacity
     - Minimum threshold cannot be greater than maximum capacity

2. **Stock Movements (`StockMovement` model)**
   - Records all inventory transactions with these types:
     - Stock In (receiving new inventory)
     - Stock Out (sales or transfers)
     - Adjustment (manual corrections)
     - Return (returned items)
     - Damaged (damaged inventory)
     - Expired (expired items)
   - Each movement tracks:
     - Previous quantity
     - Change amount
     - New quantity
     - Who performed the action
     - Reference numbers (e.g., order numbers)
     - Timestamps
   - Automatically updates the main stock quantity when movements are recorded

3. **Inventory Audits (`InventoryAudit` and `AuditItem` models)**
   - Allows periodic inventory checks with these features:
     - Audit status tracking (Pending, In Progress, Completed, Cancelled)
     - Records who initiated and completed the audit
     - Tracks start and end dates
   - For each audited item:
     - Records system quantity vs actual counted quantity
     - Calculates discrepancies
     - Tracks who checked each item
     - Allows notes for discrepancies

4. **Administrative Interface**
   - Comprehensive admin views for:
     - Stock monitoring with filtering by franchise and product category
     - Stock movement history with detailed tracking
     - Audit management with inline audit items
     - Detailed search and filtering capabilities

The system is designed for a multi-location business (franchises) with these key features:

- **Real-time Tracking**: Stock levels are updated automatically with each movement
- **Audit Trail**: Complete history of all stock changes with user accountability
- **Threshold Management**: Helps prevent stockouts and overstock situations
- **Validation Rules**: Ensures data integrity and business rules are maintained
- **Flexible Movement Types**: Handles various inventory scenarios (returns, damages, etc.)
- **Audit Process**: Structured approach to inventory verification



### Example Scenario: Monthly Inventory Audit at "Blinkit Store #123"

Let's say the store manager needs to do a monthly inventory check. Here's how it works step by step:

1. **Starting an Audit**
```python
# An audit is created when the store manager starts the process
audit = InventoryAudit(
    franchise=store_123,  # The specific store being audited
    start_date=timezone.now(),
    status='IN_PROGRESS',
    initiated_by=store_manager,
    notes="Monthly inventory check for June 2024"
)
```

2. **Creating Audit Items**
For each product in the store, an `AuditItem` is created. Let's look at three example products:

```python
# Example of audit items being created
# Product 1: Rice Bags
audit_item_1 = AuditItem(
    audit=audit,
    stock=rice_stock,
    system_quantity=100.00,  # What the computer system shows we have
    actual_quantity=98.00,   # What was actually counted on the shelf
    notes="Found 2 damaged bags",
    checked_by=store_staff_1
)
# Discrepancy = -2 (missing 2 units)

# Product 2: Milk Cartons
audit_item_2 = AuditItem(
    audit=audit,
    stock=milk_stock,
    system_quantity=50.00,   # System shows 50 cartons
    actual_quantity=50.00,   # Counted 50 cartons
    checked_by=store_staff_2
)
# Discrepancy = 0 (perfect match)

# Product 3: Apples (in kg)
audit_item_3 = AuditItem(
    audit=audit,
    stock=apple_stock,
    system_quantity=75.50,   # System shows 75.5 kg
    actual_quantity=73.20,   # Counted 73.2 kg
    notes="Some spoilage noticed",
    checked_by=store_staff_1
)
# Discrepancy = -2.3 (2.3 kg less than expected)
```

### Visual Representation

Here's how it might look in a table format:

**InventoryAudit #456**
```
Store: Blinkit Store #123
Start Date: 2024-06-01 09:00 AM
Status: IN_PROGRESS
Initiated By: John Smith (Store Manager)
Notes: Monthly inventory check for June 2024
```

**AuditItems for Audit #456**
| Product      | System Qty | Actual Qty | Discrepancy | Checked By | Notes                |
|--------------|------------|------------|-------------|------------|----------------------|
| Rice Bags    | 100.00     | 98.00      | -2.00       | Staff 1    | Found 2 damaged bags |
| Milk Cartons | 50.00      | 50.00      | 0.00        | Staff 2    |                      |
| Apples       | 75.50      | 73.20      | -2.30       | Staff 1    | Some spoilage noticed|

### The Process Flow:

1. **Audit Initiation**
   - Store manager creates new `InventoryAudit`
   - Status is set to 'PENDING' or 'IN_PROGRESS'
   - Start date is recorded

2. **Counting Process**
   - Staff members count each product
   - For each product, an `AuditItem` is created
   - System quantity is automatically recorded
   - Staff enters the actual counted quantity
   - Any discrepancies are automatically calculated
   - Notes can be added to explain differences

3. **Audit Completion**
   ```python
   # When all items are counted, the audit is completed
   audit.status = 'COMPLETED'
   audit.end_date = timezone.now()
   audit.completed_by = store_manager
   audit.save()
   ```

### Benefits of this Structure:

1. **Accountability**
   - Tracks who counted what
   - Records who initiated and completed the audit
   - Maintains timestamp for each check

2. **Discrepancy Management**
   - Easy to identify missing or excess stock
   - Notes field allows explanation of differences
   - Historical record for pattern analysis

3. **Progress Tracking**
   - Status field shows audit progress
   - Can track how long audits take
   - Can have multiple audits in different states

4. **Reporting**
   - Can generate reports of discrepancies
   - Track inventory accuracy over time
   - Identify problematic products or areas

This system is particularly useful because:
- It separates the audit process (`InventoryAudit`) from individual item counts (`AuditItem`)
- It maintains a clear record of what was expected vs. what was found
- It allows for partial audits to be conducted over time
- It provides accountability at both the audit and item level
- It helps identify patterns in inventory discrepancies
