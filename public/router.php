<?php
/**
 * Simple router for PHP built-in server
 * Routes requests to appropriate locations
 */

$requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Route API requests
if (strpos($requestUri, '/api/') === 0) {
    // Whitelist of allowed API endpoints
    $allowedEndpoints = [
        '/api/submit-order.php',
        '/api/health.php'
    ];
    
    if (in_array($requestUri, $allowedEndpoints, true)) {
        $apiFile = __DIR__ . '/..' . $requestUri;
        if (file_exists($apiFile) && is_file($apiFile)) {
            require $apiFile;
            return true;
        }
    }
    
    // API endpoint not found or not allowed
    http_response_code(404);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'API endpoint not found']);
    return true;
}

// Serve static files and let the server handle the rest
return false;
