# BusinessVision

A modern, responsive web-based order entry system built with HTML5, Bootstrap 5, vanilla JavaScript, and PHP 8.x.

## Features

- **Responsive Design**: Bootstrap 5 powered UI that works on desktop, tablet, and mobile devices
- **Dynamic Line Items**: Add/remove line items with real-time calculations
- **Automatic Calculations**: 
  - Extended price (quantity × unit price)
  - Margin percentage per line
  - Subtotal, taxes (GST/HST and P.S.T.), and order total
  - Gross profit tracking
- **Client & Server Validation**: Comprehensive validation on both frontend and backend
- **JSON Persistence**: Orders saved as JSON files (no database required)
- **Auto-generated Order Numbers**: Sequential IDs if not manually provided
- **Accessible**: Proper ARIA labels and keyboard-friendly navigation

## Tech Stack

- **Frontend**: HTML5, Bootstrap 5, Vanilla JavaScript (ES6 modules)
- **Backend**: PHP 8.x (no framework)
- **Storage**: JSON file-based persistence
- **Server**: PHP built-in server for local development

## Project Structure

```
BusinessVision/
├── public/                      # Public web root
│   ├── index.html              # Main order entry form
│   ├── router.php              # Request router for PHP server
│   └── assets/
│       ├── css/
│       │   └── styles.css      # Custom styles
│       └── js/
│           └── order-form.js   # Frontend logic & calculations
├── api/                         # Backend API endpoints
│   ├── submit-order.php        # Order submission handler
│   └── health.php              # Health check endpoint
├── data/
│   └── orders/                 # Order JSON files (git-ignored)
│       └── .gitkeep
├── .editorconfig               # Editor configuration
├── .gitignore                  # Git ignore rules
└── README.md                   # This file
```

## Prerequisites

- PHP 8.0 or higher
- Modern web browser (Chrome, Firefox, Safari, Edge)

## Installation & Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/BinaryOneLLC/BusinessVision.git
   cd BusinessVision
   ```

2. **Verify PHP version**
   ```bash
   php -v
   ```
   Ensure you have PHP 8.0 or higher.

3. **Set up data directory**
   ```bash
   mkdir -p data/orders
   chmod 755 data/orders
   ```

## Running the Application

### Using PHP Built-in Server

1. **Start the server from the public directory**
   ```bash
   php -S localhost:8000 -t public public/router.php
   ```
   
   The router.php file handles API requests routing.

2. **Access the application**
   Open your browser and navigate to:
   ```
   http://localhost:8000
   ```

3. **Test the health endpoint**
   ```
   http://localhost:8000/../api/health.php
   ```
   Or using curl:
   ```bash
   curl http://localhost:8000/../api/health.php
   ```

### Alternative: Using a different port

```bash
php -S localhost:3000 -t public public/router.php
```

Then access at `http://localhost:3000`

## Usage Guide

### Creating an Order

1. **Fill in Order Information**
   - Customer No. is required (marked with *)
   - Order Number can be left empty for auto-generation
   - Select order status (Draft, Open, On Hold, Closed)
   - Set relevant dates

2. **Add Line Items**
   - Click "Add Line" to create new rows
   - Enter product details (warehouse, part number, description, UOM)
   - Input quantity, unit price, and cost price
   - Check tax boxes if applicable (Tax 1 = GST/HST at 5%, Tax 2 = P.S.T. at 8%)
   - Extended price and margin % calculate automatically

3. **Review Summary**
   - Entries count shows lines with quantity > 0
   - Subtotal sums all extended prices
   - Add discount or freight if applicable
   - Taxes calculate automatically based on checked tax boxes
   - View total and gross profit

4. **Save Order**
   - Click "Save Order" button
   - Form validates all required fields
   - Order is saved to `data/orders/` directory
   - Success message displays the order number

5. **Reset Form**
   - Click "Reset" button to clear all data

### Validation Rules

- Customer number is required
- At least one line item with quantity > 0 is required
- Unit prices and cost prices must be >= 0
- All numeric fields must contain valid numbers
- Dates must be in valid format (YYYY-MM-DD)
- Maximum payload size: 1MB

### Tax Configuration

Tax rates are configured in both frontend and backend:

**Frontend** (`public/assets/js/order-form.js`):
```javascript
const CONFIG = {
  taxRates: {
    gst: 0.05,  // 5% GST/HST
    pst: 0.08   // 8% P.S.T.
  }
};
```

**Backend** (`api/submit-order.php`):
```php
define('GST_RATE', 0.05);
define('PST_RATE', 0.08);
```

## API Endpoints

### POST /api/submit-order.php

Submit a new order.

**Request Body:**
```json
{
  "orderNumber": "BV-20231028-143022",
  "customerNo": "CUST001",
  "shipToId": "SHIP001",
  "poNumber": "PO-12345",
  "status": "Open",
  "orderDate": "2023-10-28",
  "requiredDate": "2023-11-15",
  "invoiceDate": "2023-10-28",
  "lineItems": [
    {
      "warehouse": "WH01",
      "partNumber": "PART-001",
      "description": "Product Description",
      "uom": "EA",
      "qty": 10,
      "unitPrice": 100.00,
      "costPrice": 60.00,
      "tax1": true,
      "tax2": false
    }
  ],
  "discount": 0,
  "freight": 25.00
}
```

**Success Response:**
```json
{
  "success": true,
  "orderNumber": "BV-20231028-143022",
  "savedPath": "BV-20231028-143022.json",
  "message": "Order saved successfully"
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Customer number is required"
}
```

### GET /api/health.php

Check API health and readiness.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2023-10-28 14:30:22",
  "php_version": "8.2.10",
  "checks": {
    "data_directory": {
      "exists": true,
      "writable": true,
      "path": "/path/to/data/orders"
    }
  }
}
```

## Security Features

- Input sanitization on all user data
- HTML special characters encoding
- Maximum payload size limit (1MB)
- CORS disabled (same-origin only)
- Security headers (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection)
- Server-side calculation verification
- Safe filename generation

## Browser Compatibility

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Keyboard Shortcuts

- `Tab` / `Shift+Tab`: Navigate between fields
- `Enter`: Submit form (when not in textarea)
- `Esc`: Dismiss alerts

## Troubleshooting

### Port already in use
If port 8000 is already in use, try a different port:
```bash
php -S localhost:8080 -t public
```

### Permission denied on data directory
Ensure the data/orders directory has write permissions:
```bash
chmod 755 data/orders
```

### Orders not saving
1. Check the health endpoint: `http://localhost:8000/../api/health.php`
2. Verify the data/orders directory exists and is writable
3. Check PHP error logs

### API endpoint not found
Make sure you're running the PHP server from the project root and accessing through the correct URL structure.

## Development

### Modifying Tax Rates

Edit both files to change tax rates:
1. `public/assets/js/order-form.js` - Update `CONFIG.taxRates`
2. `api/submit-order.php` - Update `GST_RATE` and `PST_RATE` constants

### Adding Custom Fields

1. Add HTML input in `public/index.html`
2. Update `collectFormData()` in `order-form.js`
3. Update `validateOrder()` and `sanitizeOrder()` in `submit-order.php`

## Future Enhancements

- Customer and part number lookup/autocomplete
- Order history and search
- PDF export/print functionality
- Multi-user support with authentication
- Database integration
- Real-time collaboration
- Inventory tracking

## License

Copyright © 2024 BinaryOne LLC. All rights reserved.

## Support

For issues or questions, please open an issue on the GitHub repository.