<?php
declare(strict_types=1);
// Optional daily cron: php /absolute/path/private/cleanup.php
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require __DIR__ . '/app.php';
if (is_dir(__DIR__ . '/storage/consents')) \Remmil\Leads\cleanup(__DIR__ . '/storage/consents', 90 * 86400);
if (is_dir(__DIR__ . '/storage/limits')) \Remmil\Leads\cleanup(__DIR__ . '/storage/limits', 900);
