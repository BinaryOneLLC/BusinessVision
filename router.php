<?php
/**
 * router.php
 * Development server router for handling API requests
 */

$requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Route API requests
if (preg_match('#^/api/(.+)\.php$#', $requestUri, $matches)) {
    $apiFile = __DIR__ . '/api/' . $matches[1] . '.php';
    
    if (file_exists($apiFile)) {
        require $apiFile;
        exit;
    }
}

// Serve root
if ($requestUri === '/' || $requestUri === '') {
    require __DIR__ . '/public/index.html';
    exit;
}

// Try to serve from public directory
$publicPath = __DIR__ . '/public' . $requestUri;

if (file_exists($publicPath) && is_file($publicPath)) {
    // Determine content type
    $extension = pathinfo($publicPath, PATHINFO_EXTENSION);
    $mimeTypes = [
        'html' => 'text/html',
        'css' => 'text/css',
        'js' => 'application/javascript',
        'json' => 'application/json',
        'png' => 'image/png',
        'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'gif' => 'image/gif',
        'svg' => 'image/svg+xml',
        'ico' => 'image/x-icon',
    ];
    
    $contentType = $mimeTypes[$extension] ?? 'application/octet-stream';
    header("Content-Type: $contentType");
    readfile($publicPath);
    exit;
}

// 404 for everything else
http_response_code(404);
echo '<!DOCTYPE html>
<html>
<head><title>404 Not Found</title></head>
<body><h1>404 Not Found</h1><p>The requested resource was not found.</p></body>
</html>';
