<?php
/**
 * submit-order.php
 * Handles order submission and persistence
 */

declare(strict_types=1);

// Security headers
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');

// CORS - same-origin only
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$host = $_SERVER['HTTP_HOST'] ?? '';
if ($origin && parse_url($origin, PHP_URL_HOST) === $host) {
    header("Access-Control-Allow-Origin: $origin");
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
}

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Only allow POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

// Configuration
define('MAX_PAYLOAD_SIZE', 1048576); // 1MB
define('ORDERS_DIR', dirname(__DIR__) . '/data/orders/');

// Tax rates configuration
const TAX_RATES = [
    'gst' => 0.05,  // 5%
    'pst' => 0.08   // 8%
];

/**
 * Send JSON response
 */
function sendResponse(bool $success, array $data = [], int $code = 200): void
{
    http_response_code($code);
    echo json_encode(array_merge(['success' => $success], $data));
    exit;
}

/**
 * Sanitize string input
 */
function sanitizeString(?string $input, int $maxLength = 255): string
{
    if ($input === null) {
        return '';
    }
    $sanitized = trim(strip_tags($input));
    return mb_substr($sanitized, 0, $maxLength);
}

/**
 * Sanitize numeric input
 */
function sanitizeNumber($input, float $min = 0): float
{
    $value = filter_var($input, FILTER_VALIDATE_FLOAT);
    if ($value === false) {
        return 0.0;
    }
    return max($min, $value);
}

/**
 * Validate date format
 */
function isValidDate(?string $date): bool
{
    if (empty($date)) {
        return true; // Optional field
    }
    $d = DateTime::createFromFormat('Y-m-d', $date);
    return $d && $d->format('Y-m-d') === $date;
}

/**
 * Generate order number
 */
function generateOrderNumber(): string
{
    return 'BV-' . date('Ymd-His');
}

/**
 * Validate and sanitize header data
 */
function validateHeader(array $header): array
{
    // Required fields
    if (empty($header['customerNo'])) {
        sendResponse(false, ['error' => 'Customer Number is required'], 400);
    }
    
    // Validate dates
    foreach (['orderDate', 'requiredDate', 'invoiceDate'] as $dateField) {
        if (isset($header[$dateField]) && !isValidDate($header[$dateField])) {
            sendResponse(false, ['error' => "Invalid date format for $dateField"], 400);
        }
    }
    
    // Validate status
    $validStatuses = ['Draft', 'Open', 'On Hold', 'Closed'];
    if (!in_array($header['status'] ?? '', $validStatuses, true)) {
        $header['status'] = 'Draft';
    }
    
    return [
        'orderNumber' => sanitizeString($header['orderNumber'] ?? '', 50),
        'customerNo' => sanitizeString($header['customerNo'], 50),
        'shipToId' => sanitizeString($header['shipToId'] ?? '', 50),
        'poNumber' => sanitizeString($header['poNumber'] ?? '', 50),
        'status' => $header['status'],
        'orderDate' => sanitizeString($header['orderDate'] ?? '', 10),
        'requiredDate' => sanitizeString($header['requiredDate'] ?? '', 10),
        'invoiceDate' => sanitizeString($header['invoiceDate'] ?? '', 10)
    ];
}

/**
 * Validate and sanitize line items
 */
function validateLineItems(array $lineItems): array
{
    if (empty($lineItems)) {
        sendResponse(false, ['error' => 'At least one line item is required'], 400);
    }
    
    $validated = [];
    $hasValidLine = false;
    
    foreach ($lineItems as $item) {
        $quantity = sanitizeNumber($item['quantity'] ?? 0, 0);
        $unitPrice = sanitizeNumber($item['unitPrice'] ?? 0, 0);
        
        if ($quantity > 0 && $unitPrice >= 0) {
            $hasValidLine = true;
        }
        
        $validated[] = [
            'warehouse' => sanitizeString($item['warehouse'] ?? '', 10),
            'partNumber' => sanitizeString($item['partNumber'] ?? '', 50),
            'description' => sanitizeString($item['description'] ?? '', 200),
            'sellUOM' => sanitizeString($item['sellUOM'] ?? '', 10),
            'quantity' => $quantity,
            'unitPrice' => $unitPrice,
            'costPrice' => sanitizeNumber($item['costPrice'] ?? 0, 0),
            'salesTax1' => (bool)($item['salesTax1'] ?? false),
            'salesTax2' => (bool)($item['salesTax2'] ?? false)
        ];
    }
    
    if (!$hasValidLine) {
        sendResponse(false, ['error' => 'At least one line item must have quantity > 0 and valid unit price'], 400);
    }
    
    return $validated;
}

/**
 * Validate summary calculations
 */
function validateSummary(array $summary, array $lineItems): bool
{
    // Recalculate subtotal
    $calculatedSubtotal = 0;
    foreach ($lineItems as $item) {
        $calculatedSubtotal += $item['quantity'] * $item['unitPrice'];
    }
    
    // Allow small floating-point differences
    $subtotalDiff = abs($calculatedSubtotal - ($summary['subtotal'] ?? 0));
    if ($subtotalDiff > 0.01) {
        sendResponse(false, ['error' => 'Subtotal calculation mismatch'], 400);
    }
    
    // Validate discount and freight
    if (($summary['discount'] ?? 0) < 0 || ($summary['freight'] ?? 0) < 0) {
        sendResponse(false, ['error' => 'Discount and freight must be non-negative'], 400);
    }
    
    return true;
}

/**
 * Save order to JSON file
 */
function saveOrder(array $orderData): array
{
    // Ensure orders directory exists
    if (!is_dir(ORDERS_DIR)) {
        if (!mkdir(ORDERS_DIR, 0755, true)) {
            sendResponse(false, ['error' => 'Failed to create orders directory'], 500);
        }
    }
    
    // Generate order number if not provided
    if (empty($orderData['header']['orderNumber'])) {
        $orderData['header']['orderNumber'] = generateOrderNumber();
    }
    
    $orderNumber = $orderData['header']['orderNumber'];
    
    // Create filename (sanitize order number for filesystem)
    $safeOrderNumber = preg_replace('/[^a-zA-Z0-9-_]/', '_', $orderNumber);
    $filename = ORDERS_DIR . $safeOrderNumber . '.json';
    
    // Add metadata
    $orderData['metadata'] = [
        'createdAt' => date('c'),
        'version' => '1.0'
    ];
    
    // Write to file
    $json = json_encode($orderData, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    if ($json === false) {
        sendResponse(false, ['error' => 'Failed to encode order data'], 500);
    }
    
    if (file_put_contents($filename, $json, LOCK_EX) === false) {
        sendResponse(false, ['error' => 'Failed to save order file'], 500);
    }
    
    return [
        'orderNumber' => $orderNumber,
        'savedPath' => $filename
    ];
}

// Main execution
try {
    // Check content length
    $contentLength = (int)($_SERVER['CONTENT_LENGTH'] ?? 0);
    if ($contentLength > MAX_PAYLOAD_SIZE) {
        sendResponse(false, ['error' => 'Payload too large'], 413);
    }
    
    // Read and decode JSON
    $rawInput = file_get_contents('php://input');
    if ($rawInput === false) {
        sendResponse(false, ['error' => 'Failed to read request body'], 400);
    }
    
    $input = json_decode($rawInput, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        sendResponse(false, ['error' => 'Invalid JSON: ' . json_last_error_msg()], 400);
    }
    
    // Validate structure
    if (!isset($input['header']) || !isset($input['lineItems']) || !isset($input['summary'])) {
        sendResponse(false, ['error' => 'Missing required fields: header, lineItems, or summary'], 400);
    }
    
    // Validate and sanitize data
    $validatedHeader = validateHeader($input['header']);
    $validatedLineItems = validateLineItems($input['lineItems']);
    validateSummary($input['summary'], $validatedLineItems);
    
    // Prepare order data
    $orderData = [
        'header' => $validatedHeader,
        'lineItems' => $validatedLineItems,
        'summary' => [
            'entries' => (int)($input['summary']['entries'] ?? 0),
            'subtotal' => sanitizeNumber($input['summary']['subtotal'] ?? 0),
            'discount' => sanitizeNumber($input['summary']['discount'] ?? 0),
            'freight' => sanitizeNumber($input['summary']['freight'] ?? 0),
            'gst' => sanitizeNumber($input['summary']['gst'] ?? 0),
            'pst' => sanitizeNumber($input['summary']['pst'] ?? 0),
            'total' => sanitizeNumber($input['summary']['total'] ?? 0),
            'grossProfit' => sanitizeNumber($input['summary']['grossProfit'] ?? 0, -PHP_FLOAT_MAX)
        ]
    ];
    
    // Save order
    $result = saveOrder($orderData);
    
    sendResponse(true, $result, 201);
    
} catch (Exception $e) {
    error_log('Order submission error: ' . $e->getMessage());
    sendResponse(false, ['error' => 'Internal server error'], 500);
}
