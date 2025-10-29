# BusinessVision

A web-based order form application for managing business orders with line items, customer information, and automated calculations.

## Features

- **Customer Information Management**: Capture customer name, email, phone, and order date
- **Dynamic Line Items**: Add, remove, and calculate multiple order line items
- **Automatic Calculations**: Real-time subtotal, tax (10%), and total calculations
- **Order Persistence**: Save orders as JSON files via REST API
- **Responsive Design**: Bootstrap 5-based UI that works on all devices
- **Form Validation**: Client and server-side validation for data integrity

## Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6 Modules), Bootstrap 5
- **Backend**: PHP 7.4+
- **Storage**: File-based JSON storage
- **Web Server**: Apache with mod_rewrite

## Deployment: Option C

This application is deployed using **Option C** architecture:

- **index.html at repository root**: The main entry page is served from the root directory (`/index.html`)
- **Absolute paths to /public assets**: All static assets (CSS, JS) are referenced with absolute paths pointing to `/public/assets/...`
  - CSS: `/public/assets/css/styles.css`
  - JS: `/public/assets/js/order-form.js`
- **API under /api**: RESTful API endpoints are located at `/api/`
  - Submit Order: `/api/submit-order.php`
  - Health Check: `/api/health.php`
- **data/.htaccess protection**: The `data/orders/` directory is protected from direct web access via `.htaccess` rules
- **No root rewrite to /public**: Unlike Option A/B, there are no root-level `.htaccess` rules that redirect `/` to `/public`, keeping the index at the repository root

### Directory Structure

```
BusinessVision/
├── index.html              # Main entry page (at root)
├── public/
│   └── assets/
│       ├── css/
│       │   └── styles.css  # Custom styles
│       └── js/
│           └── order-form.js  # Order form logic (ES6 module)
├── api/
│   ├── submit-order.php    # Order submission endpoint
│   └── health.php          # API health check
├── data/
│   ├── .htaccess          # Denies public access
│   └── orders/            # Saved orders (JSON files)
└── README.md
```

## Installation

1. Clone the repository to your web server document root
2. Ensure PHP 7.4+ is installed and configured
3. Ensure the `data/orders` directory is writable by the web server:
   ```bash
   chmod 755 data/orders
   ```
4. Access the application via your web server (e.g., `http://localhost/`)

## Usage

1. **Open the Application**: Navigate to the root URL in your browser
2. **Fill Customer Information**: Enter customer name, email, phone, and select order date
3. **Add Line Items**: Click "Add Item" to add products/services
   - Enter description, quantity, and unit price for each item
   - Line totals are calculated automatically
4. **Review Summary**: Check the calculated subtotal, tax, and total amounts
5. **Save Order**: Click "Save Order" to submit the order to the API
6. **Reset Form**: Click "Reset" to clear all fields and start a new order

## API Endpoints

### Health Check
```
GET /api/health.php
```
Returns API status and storage availability:
```json
{
  "ok": true,
  "timestamp": "2025-10-29 12:00:00",
  "api": {
    "status": "healthy",
    "version": "1.0.0"
  },
  "storage": {
    "ordersDir": "/path/to/data/orders",
    "exists": true,
    "writable": true
  }
}
```

### Submit Order
```
POST /api/submit-order.php
Content-Type: application/json
```
Request body:
```json
{
  "customerName": "John Doe",
  "customerEmail": "john@example.com",
  "customerPhone": "555-1234",
  "orderDate": "2025-10-29",
  "lineItems": [
    {
      "description": "Product A",
      "quantity": 2,
      "unitPrice": 50.00,
      "lineTotal": 100.00
    }
  ],
  "subtotal": 100.00,
  "tax": 10.00,
  "total": 110.00
}
```

Response:
```json
{
  "success": true,
  "message": "Order saved successfully",
  "orderId": "ORD-20251029-abc123",
  "filename": "ORD-20251029-abc123.json"
}
```

## Security

- **Data Protection**: The `data/.htaccess` file prevents direct web access to order files
- **Input Validation**: All API endpoints validate input data
- **Email Validation**: Customer email addresses are validated server-side
- **CORS Headers**: Configured for same-origin API requests

## Development

### Testing the API Health
```bash
curl http://localhost/api/health.php
```

### Viewing Order Files
Order files are stored in `data/orders/` with filenames like `ORD-20251029-abc123.json`

## License

Copyright © 2025 BinaryOne LLC. All rights reserved.