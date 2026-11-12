<?php
declare(strict_types=1);
ini_set('display_errors', '0');

// public_html/api/lead.php -> private/ outside the website directory.
$private = getenv('REMMIL_PRIVATE_DIR') ?: dirname(__DIR__, 2) . '/private';
if (!is_file($private . '/app.php')) {
    http_response_code(503);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode(['ok' => false, 'error' => 'mail_unavailable']);
    exit;
}
require $private . '/app.php';
\Remmil\Leads\handle($private);
