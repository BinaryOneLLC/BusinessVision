<?php
/**
 * Simple router for PHP built-in server
 * Routes requests to appropriate locations
 */

$requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Route API requests
if (strpos($requestUri, '/api/') === 0) {
    $apiFile = __DIR__ . '/../api/' . basename($requestUri);
    if (file_exists($apiFile)) {
        require $apiFile;
        return true;
    }
}

// Serve static files and let the server handle the rest
return false;
