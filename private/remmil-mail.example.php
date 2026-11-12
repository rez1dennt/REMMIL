<?php
declare(strict_types=1);

// Copy to remmil-mail.php in the PRIVATE directory above public_html.
// The prepared hosting archive already contains the configured private file.
return [
    'smtp_host' => 'smtp.mail.ru',
    'smtp_port' => 465,
    'smtp_security' => 'ssl',
    'smtp_user' => '2009-parketdok@mail.ru',
    'smtp_password' => '',
    'recipient' => '2009-parketdok@mail.ru',
    'site_url' => '',
    'rate_salt' => '', // Generate with bin2hex(random_bytes(32)).
    'rate_limit' => 5,
    'rate_window_seconds' => 900,
    'retention_days' => 90,
];
