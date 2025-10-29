<?php
/**
 * Business Vision - API Health Check
 * Returns status of the API and checks directory permissions
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// Check if data/orders directory exists and is writable
$ordersDir = __DIR__ . '/../data/orders';
$dirExists = is_dir($ordersDir);
$dirWritable = $dirExists && is_writable($ordersDir);

// Build health response
$health = [
    'ok' => true,
    'timestamp' => date('Y-m-d H:i:s'),
    'api' => [
        'status' => 'healthy',
        'version' => '1.0.0'
    ],
    'storage' => [
        'ordersDir' => $ordersDir,
        'exists' => $dirExists,
        'writable' => $dirWritable
    ]
];

// If directory doesn't exist or isn't writable, mark as not fully healthy
if (!$dirExists || !$dirWritable) {
    $health['ok'] = false;
    $health['api']['status'] = 'degraded';
    $health['warnings'] = [];
    
    if (!$dirExists) {
        $health['warnings'][] = 'Orders directory does not exist';
    }
    if ($dirExists && !$dirWritable) {
        $health['warnings'][] = 'Orders directory is not writable';
    }
}

http_response_code(200);
echo json_encode($health, JSON_PRETTY_PRINT);
