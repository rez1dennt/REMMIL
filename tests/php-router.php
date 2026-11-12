<?php
// Make the development PHP server behave like a static shared-host document root.
// The built-in server otherwise falls back to index.html for missing paths.
$root = realpath($_SERVER['DOCUMENT_ROOT']);
$url = rawurldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));
if ($url === '/') return false;
$file = realpath($root . $url);
if ($file === false || !str_starts_with($file, $root . DIRECTORY_SEPARATOR) || !is_file($file)) {
    http_response_code(404);
    echo 'Not found';
    return true;
}
return false;
