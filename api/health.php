<?php
/**
 * BusinessVision Health Check API
 * Simple readiness endpoint
 */

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

// Check if data directory is writable
$dataDir = __DIR__ . '/../data/orders';
$dataWritable = is_dir($dataDir) && is_writable($dataDir);

// System information
$health = [
    'status' => $dataWritable ? 'healthy' : 'degraded',
    'timestamp' => date('Y-m-d H:i:s'),
    'php_version' => PHP_VERSION,
    'checks' => [
        'data_directory' => [
            'exists' => is_dir($dataDir),
            'writable' => $dataWritable,
            'path' => $dataDir
        ]
    ]
];

// Set appropriate HTTP status code
http_response_code($dataWritable ? 200 : 503);

echo json_encode($health, JSON_PRETTY_PRINT);
