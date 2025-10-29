<?php
/**
 * Business Vision - Order Submission API
 * Receives order data and saves it as JSON in the data/orders directory
 */

// Set headers for JSON response and CORS
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Only accept POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Method not allowed. Use POST.'
    ]);
    exit();
}

// Get JSON input
$input = file_get_contents('php://input');
$orderData = json_decode($input, true);

// Validate input
if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Invalid JSON data'
    ]);
    exit();
}

// Validate required fields
$requiredFields = ['customerName', 'customerEmail', 'orderDate', 'lineItems'];
foreach ($requiredFields as $field) {
    if (!isset($orderData[$field]) || empty($orderData[$field])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => "Missing required field: $field"
        ]);
        exit();
    }
}

// Validate email format
if (!filter_var($orderData['customerEmail'], FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Invalid email address'
    ]);
    exit();
}

// Validate line items
if (!is_array($orderData['lineItems']) || count($orderData['lineItems']) === 0) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'At least one line item is required'
    ]);
    exit();
}

// Generate unique order ID
$orderId = 'ORD-' . date('Ymd') . '-' . substr(uniqid(), -6);

// Add metadata to order
$orderData['orderId'] = $orderId;
$orderData['createdAt'] = date('Y-m-d H:i:s');
$orderData['status'] = 'pending';

// Ensure data/orders directory exists
$ordersDir = __DIR__ . '/../data/orders';
if (!is_dir($ordersDir)) {
    if (!mkdir($ordersDir, 0755, true)) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Failed to create orders directory'
        ]);
        exit();
    }
}

// Save order to file
$filename = $ordersDir . '/' . $orderId . '.json';
$jsonData = json_encode($orderData, JSON_PRETTY_PRINT);

if (file_put_contents($filename, $jsonData) === false) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to save order'
    ]);
    exit();
}

// Return success response
http_response_code(201);
echo json_encode([
    'success' => true,
    'message' => 'Order saved successfully',
    'orderId' => $orderId,
    'filename' => basename($filename)
]);
