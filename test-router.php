<?php
$requestUri = '/assets/js/order-form.js';
$publicPath = __DIR__ . '/public' . $requestUri;
echo "Request: $requestUri\n";
echo "Public path: $publicPath\n";
echo "Exists: " . (file_exists($publicPath) ? 'YES' : 'NO') . "\n";
echo "Is file: " . (is_file($publicPath) ? 'YES' : 'NO') . "\n";
echo "Return false would work: " . (file_exists($publicPath) ? 'YES' : 'NO') . "\n";
