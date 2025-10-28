<?php
/**
 * BusinessVision Order Submission API
 * Validates and saves order data to JSON files
 */

// Security headers
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

// Configuration
define('MAX_PAYLOAD_SIZE', 1048576); // 1MB
define('DATA_DIR', __DIR__ . '/../data/orders');
define('GST_RATE', 0.05);
define('PST_RATE', 0.08);

/**
 * Main execution
 */
try {
    // Get and validate input
    $rawInput = file_get_contents('php://input');
    
    // Check payload size
    if (strlen($rawInput) > MAX_PAYLOAD_SIZE) {
        throw new Exception('Payload too large (exceeds 1MB limit)');
    }
    
    // Parse JSON
    $data = json_decode($rawInput, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Invalid JSON: ' . json_last_error_msg());
    }
    
    // Validate order data
    validateOrder($data);
    
    // Generate order number if not provided
    if (empty($data['orderNumber'])) {
        $data['orderNumber'] = generateOrderNumber();
    }
    
    // Sanitize data
    $sanitizedData = sanitizeOrder($data);
    
    // Recalculate summary to prevent tampering
    $sanitizedData['summary'] = recalculateSummary($sanitizedData);
    
    // Add metadata
    $sanitizedData['metadata'] = [
        'createdAt' => date('Y-m-d H:i:s'),
        'ipAddress' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
        'userAgent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown'
    ];
    
    // Ensure data directory exists
    if (!is_dir(DATA_DIR)) {
        mkdir(DATA_DIR, 0755, true);
    }
    
    // Save to file
    $filename = sanitizeFilename($sanitizedData['orderNumber']);
    $filepath = DATA_DIR . '/' . $filename . '.json';
    
    // Check if file already exists
    if (file_exists($filepath)) {
        // Append timestamp to make it unique
        $filename = $filename . '-' . time();
        $filepath = DATA_DIR . '/' . $filename . '.json';
    }
    
    $jsonContent = json_encode($sanitizedData, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    if (file_put_contents($filepath, $jsonContent) === false) {
        throw new Exception('Failed to save order file');
    }
    
    // Success response
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'orderNumber' => $sanitizedData['orderNumber'],
        'savedPath' => basename($filepath),
        'message' => 'Order saved successfully'
    ]);
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}

/**
 * Validate order data
 */
function validateOrder($data) {
    // Check required fields
    if (empty($data['customerNo'])) {
        throw new Exception('Customer number is required');
    }
    
    // Validate line items
    if (empty($data['lineItems']) || !is_array($data['lineItems'])) {
        throw new Exception('At least one line item is required');
    }
    
    $validLines = array_filter($data['lineItems'], function($line) {
        return isset($line['qty']) && $line['qty'] > 0;
    });
    
    if (count($validLines) === 0) {
        throw new Exception('At least one line item with quantity > 0 is required');
    }
    
    // Validate each line item
    foreach ($data['lineItems'] as $index => $line) {
        if (!isset($line['qty']) || !is_numeric($line['qty']) || $line['qty'] < 0) {
            throw new Exception("Line " . ($index + 1) . ": Invalid quantity");
        }
        
        if (!isset($line['unitPrice']) || !is_numeric($line['unitPrice']) || $line['unitPrice'] < 0) {
            throw new Exception("Line " . ($index + 1) . ": Invalid unit price");
        }
        
        if (!isset($line['costPrice']) || !is_numeric($line['costPrice']) || $line['costPrice'] < 0) {
            throw new Exception("Line " . ($index + 1) . ": Invalid cost price");
        }
    }
    
    // Validate numeric fields
    if (isset($data['discount']) && (!is_numeric($data['discount']) || $data['discount'] < 0)) {
        throw new Exception('Invalid discount value');
    }
    
    if (isset($data['freight']) && (!is_numeric($data['freight']) || $data['freight'] < 0)) {
        throw new Exception('Invalid freight value');
    }
    
    // Validate dates if provided
    $dateFields = ['orderDate', 'requiredDate', 'invoiceDate'];
    foreach ($dateFields as $field) {
        if (!empty($data[$field]) && !validateDate($data[$field])) {
            throw new Exception("Invalid $field format");
        }
    }
}

/**
 * Sanitize order data
 */
function sanitizeOrder($data) {
    return [
        'orderNumber' => sanitizeString($data['orderNumber'] ?? ''),
        'customerNo' => sanitizeString($data['customerNo']),
        'shipToId' => sanitizeString($data['shipToId'] ?? ''),
        'poNumber' => sanitizeString($data['poNumber'] ?? ''),
        'status' => sanitizeString($data['status'] ?? 'Draft'),
        'orderDate' => sanitizeString($data['orderDate'] ?? ''),
        'requiredDate' => sanitizeString($data['requiredDate'] ?? ''),
        'invoiceDate' => sanitizeString($data['invoiceDate'] ?? ''),
        'lineItems' => array_map('sanitizeLineItem', $data['lineItems']),
        'discount' => floatval($data['discount'] ?? 0),
        'freight' => floatval($data['freight'] ?? 0)
    ];
}

/**
 * Sanitize a line item
 */
function sanitizeLineItem($line) {
    return [
        'warehouse' => sanitizeString($line['warehouse'] ?? ''),
        'partNumber' => sanitizeString($line['partNumber'] ?? ''),
        'description' => sanitizeString($line['description'] ?? ''),
        'uom' => sanitizeString($line['uom'] ?? ''),
        'qty' => floatval($line['qty'] ?? 0),
        'unitPrice' => floatval($line['unitPrice'] ?? 0),
        'costPrice' => floatval($line['costPrice'] ?? 0),
        'tax1' => !empty($line['tax1']),
        'tax2' => !empty($line['tax2']),
        'extdPrice' => floatval($line['qty'] ?? 0) * floatval($line['unitPrice'] ?? 0)
    ];
}

/**
 * Sanitize string
 */
function sanitizeString($value) {
    return htmlspecialchars(strip_tags(trim($value)), ENT_QUOTES, 'UTF-8');
}

/**
 * Recalculate summary to prevent client-side tampering
 */
function recalculateSummary($data) {
    $subtotal = 0;
    $totalCost = 0;
    $hasTax1 = false;
    $hasTax2 = false;
    $entries = 0;
    
    foreach ($data['lineItems'] as $line) {
        if ($line['qty'] > 0) {
            $entries++;
            $extdPrice = $line['qty'] * $line['unitPrice'];
            $subtotal += $extdPrice;
            $totalCost += $line['qty'] * $line['costPrice'];
            
            if ($line['tax1']) {
                $hasTax1 = true;
            }
            if ($line['tax2']) {
                $hasTax2 = true;
            }
        }
    }
    
    $discount = $data['discount'];
    $freight = $data['freight'];
    
    $taxableAmount = $subtotal - $discount + $freight;
    $gst = $hasTax1 ? $taxableAmount * GST_RATE : 0;
    $pst = $hasTax2 ? $taxableAmount * PST_RATE : 0;
    
    $total = $subtotal - $discount + $freight + $gst + $pst;
    $grossProfit = $subtotal - $totalCost;
    
    return [
        'entries' => $entries,
        'subtotal' => round($subtotal, 2),
        'discount' => round($discount, 2),
        'freight' => round($freight, 2),
        'gst' => round($gst, 2),
        'pst' => round($pst, 2),
        'total' => round($total, 2),
        'grossProfit' => round($grossProfit, 2)
    ];
}

/**
 * Generate order number
 */
function generateOrderNumber() {
    return 'BV-' . date('Ymd-His');
}

/**
 * Sanitize filename
 */
function sanitizeFilename($filename) {
    // Remove any character that's not alphanumeric, dash, or underscore
    $filename = preg_replace('/[^a-zA-Z0-9\-_]/', '-', $filename);
    // Remove multiple consecutive dashes
    $filename = preg_replace('/-+/', '-', $filename);
    // Trim dashes from ends
    $filename = trim($filename, '-');
    
    return $filename ?: 'order-' . time();
}

/**
 * Validate date format
 */
function validateDate($date) {
    $d = DateTime::createFromFormat('Y-m-d', $date);
    return $d && $d->format('Y-m-d') === $date;
}
