<?php
/**
 * health.php
 * Simple health check endpoint
 */

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

$checks = [
    'php' => version_compare(PHP_VERSION, '8.0.0', '>='),
    'ordersDir' => is_dir(dirname(__DIR__) . '/data/orders/') && is_writable(dirname(__DIR__) . '/data/orders/'),
    'jsonExtension' => extension_loaded('json')
];

$allHealthy = !in_array(false, $checks, true);

http_response_code($allHealthy ? 200 : 503);

echo json_encode([
    'status' => $allHealthy ? 'healthy' : 'unhealthy',
    'timestamp' => date('c'),
    'checks' => $checks
], JSON_PRETTY_PRINT);
