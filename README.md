# BusinessVision Order Entry System

A simplified, responsive web order form for the BusinessVision project. This application provides a clean interface for creating and managing sales orders with real-time calculations and persistent storage.

## Features

- **Responsive Design**: Built with Bootstrap 5, works on desktop, tablet, and mobile devices
- **Real-time Calculations**: Automatic updates for extended prices, margins, taxes, and totals
- **Dynamic Line Items**: Add/remove line items with live calculations
- **Tax Management**: Configurable GST/HST (5%) and P.S.T. (8%) rates
- **Client & Server Validation**: Double-layer validation for data integrity
- **JSON Persistence**: Orders saved as JSON files for easy retrieval
- **Accessible**: Semantic HTML with ARIA attributes and keyboard-friendly inputs

## Tech Stack

- **Frontend**: HTML5, Bootstrap 5, Vanilla JavaScript (ES Modules)
- **Backend**: PHP 8.x (no framework required)
- **Storage**: JSON file-based persistence (no database needed)
- **Server**: PHP built-in development server

## Project Structure

```
BusinessVision/
├── api/
│   ├── submit-order.php    # Order submission endpoint
│   └── health.php           # Health check endpoint
├── data/
│   └── orders/              # Order JSON files (git-ignored)
│       └── .gitkeep
├── public/
│   ├── index.html           # Main order entry form
│   └── assets/
│       ├── css/
│       │   └── styles.css   # Custom styles
│       └── js/
│           └── order-form.js # Client-side logic
├── .editorconfig
├── .gitignore
└── README.md
```

## Requirements

- PHP 8.0 or higher
- Modern web browser with JavaScript enabled
- No database required
- No external dependencies or frameworks

## Setup & Installation

### 1. Clone the Repository

```bash
git clone https://github.com/BinaryOneLLC/BusinessVision.git
cd BusinessVision
```

### 2. Verify PHP Installation

```bash
php --version
```

Ensure you have PHP 8.0 or higher installed.

### 3. Set Directory Permissions

```bash
chmod 755 data/orders
```

### 4. Start the Development Server

```bash
php -S localhost:8000 router.php
```

The application will be available at `http://localhost:8000`

**Note**: Use the `router.php` file (not `-t public`) to ensure API endpoints and static assets are properly routed.

## Usage

### Creating an Order

1. **Fill Header Information**
   - Customer No. (required)
   - Optional: Order Number, Ship-to ID, P.O. Number
   - Select Status (Draft, Open, On Hold, Closed)
   - Enter relevant dates (Order, Required, Invoice)

2. **Add Line Items**
   - Click "Add Line" to create a new row
   - Enter: Warehouse, Part Number, Description, UOM
   - Set Quantity and Unit Price (required for valid line)
   - Optional: Cost Price, Sales Tax 1 & 2 checkboxes
   - Extended Price and Margin % calculate automatically

3. **Review Summary**
   - View auto-calculated Subtotal
   - Add Discount or Freight if applicable
   - Review calculated GST/HST and P.S.T.
   - Check Total and Gross Profit

4. **Save Order**
   - Click "Save Order" button
   - Order is validated and saved to `data/orders/`
   - If Order Number is empty, one is auto-generated (format: BV-YYYYMMDD-HHMMSS)
   - Success notification displays the order number

### Form Validation

**Client-side validation:**
- Customer Number is required
- At least one line item with qty > 0 and unit price ≥ 0
- Numeric validations for all number fields
- Date format validation

**Server-side validation:**
- Re-validates all client-side rules
- Sanitizes all input data
- Rejects payloads over 1MB
- Verifies calculation accuracy

### Calculations

**Line Item Calculations:**
- Extended Price = Quantity × Unit Price
- Margin % = (1 - Cost Price / Unit Price) × 100

**Summary Calculations:**
- Subtotal = Sum of all Extended Prices
- GST/HST = 5% of lines with Sales Tax 1 checked
- P.S.T. = 8% of lines with Sales Tax 2 checked
- Total = Subtotal - Discount + Freight + GST + PST
- Gross Profit = Subtotal - Sum(Cost Price × Quantity)

## API Endpoints

### POST /api/submit-order.php

Submit a new order for persistence.

**Request Body:**
```json
{
  "header": {
    "orderNumber": "BV-20231015-143022",
    "customerNo": "CUST-001",
    "shipToId": "SHIP-01",
    "poNumber": "PO-12345",
    "status": "Draft",
    "orderDate": "2023-10-15",
    "requiredDate": "2023-10-20",
    "invoiceDate": ""
  },
  "lineItems": [
    {
      "warehouse": "WH1",
      "partNumber": "PART-001",
      "description": "Product Description",
      "sellUOM": "EA",
      "quantity": 10,
      "unitPrice": 100.00,
      "costPrice": 60.00,
      "salesTax1": true,
      "salesTax2": false
    }
  ],
  "summary": {
    "entries": 1,
    "subtotal": 1000.00,
    "discount": 0,
    "freight": 50.00,
    "gst": 50.00,
    "pst": 0,
    "total": 1100.00,
    "grossProfit": 400.00
  }
}
```

**Response (Success):**
```json
{
  "success": true,
  "orderNumber": "BV-20231015-143022",
  "savedPath": "/path/to/data/orders/BV-20231015-143022.json"
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Customer Number is required"
}
```

### GET /api/health.php

Check system health and readiness.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2023-10-15T14:30:22+00:00",
  "checks": {
    "php": true,
    "ordersDir": true,
    "jsonExtension": true
  }
}
```

## Configuration

### Tax Rates

Tax rates are configured in two locations:

**JavaScript (public/assets/js/order-form.js):**
```javascript
const CONFIG = {
  taxRates: {
    gst: 0.05,  // 5% GST/HST
    pst: 0.08   // 8% P.S.T.
  }
};
```

**PHP (api/submit-order.php):**
```php
const TAX_RATES = [
    'gst' => 0.05,  // 5%
    'pst' => 0.08   // 8%
];
```

To change tax rates, update both locations and restart the server.

## Security Features

- Input sanitization on all user data
- CSRF protection via same-origin policy
- XSS protection headers
- Maximum payload size limit (1MB)
- SQL injection not applicable (no database)
- File upload validation
- CORS disabled by default

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers with JavaScript enabled

## Development

### Code Structure

The JavaScript code is modular with pure functions for calculations:
- `calculateExtendedPrice(quantity, unitPrice)`
- `calculateMargin(costPrice, unitPrice)`
- `calculateSubtotal(items)`
- `calculateGST(items, rate)`
- `calculatePST(items, rate)`
- `calculateGrossProfit(items)`
- `calculateTotal(subtotal, discount, freight, gst, pst)`

These functions are exported for potential testing.

### Testing Locally

1. Start the server: `php -S localhost:8000 router.php`
2. Open browser to `http://localhost:8000`
3. Check health endpoint: `http://localhost:8000/api/health.php`
4. Create test orders with various scenarios
5. Verify JSON files in `data/orders/`

### Print Support

The application includes print-friendly CSS. Use browser's Print function (Ctrl/Cmd+P) to print orders.

## Troubleshooting

**Problem**: "Failed to create orders directory"
**Solution**: Ensure `data/orders/` exists and is writable: `chmod 755 data/orders`

**Problem**: "Method not allowed"
**Solution**: Ensure you're using POST for submit-order.php endpoint

**Problem**: Port 8000 already in use
**Solution**: Use a different port: `php -S localhost:8080 router.php`

**Problem**: Orders not saving
**Solution**: Check PHP error logs and verify write permissions on `data/orders/`

## Future Enhancements

Potential features for future versions:
- Customer and part number lookups with autocomplete
- Order search and edit functionality
- PDF export of orders
- Database integration (MySQL/PostgreSQL)
- User authentication and authorization
- Order status workflow automation
- Reporting and analytics dashboard
- Email notifications
- API for third-party integrations

## License

Copyright © 2023 BinaryOne LLC. All rights reserved.

## Support

For issues, questions, or contributions, please contact the development team.