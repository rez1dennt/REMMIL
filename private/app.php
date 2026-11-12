<?php
declare(strict_types=1);
namespace Remmil\Leads;

function answer(int $status, string $error = '', array $extra = []): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    if ($status === 405) header('Allow: POST');
    if ($status === 429) header('Retry-After: 900');
    echo json_encode(['ok' => $status === 200] + ($error ? ['error' => $error] : []) + $extra, JSON_UNESCAPED_UNICODE);
    exit;
}

function jsonWrite($file, array $data): void
{
    $encoded = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    rewind($file);
    if (!ftruncate($file, 0) || fwrite($file, $encoded) !== strlen($encoded) || !fflush($file)) {
        throw new \RuntimeException('storage_write_failed');
    }
}

function cleanup(string $directory, int $seconds): void
{
    foreach (glob($directory . '/*.json') ?: [] as $file) {
        if (is_file($file) && filemtime($file) < time() - $seconds && !unlink($file)) {
            throw new \RuntimeException('storage_cleanup_failed');
        }
    }
}

function handle(string $private): never
{
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') answer(405, 'method_not_allowed');
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin !== '') {
        $parts = parse_url($origin);
        $originHost = strtolower(($parts['host'] ?? '') . (isset($parts['port']) ? ':' . $parts['port'] : ''));
        if (!in_array($parts['scheme'] ?? '', ['http', 'https'], true) || $originHost !== strtolower($_SERVER['HTTP_HOST'] ?? '')) answer(403, 'origin_not_allowed');
    }
    if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 8192) answer(413, 'body_too_large');
    if (strtolower(trim(explode(';', $_SERVER['CONTENT_TYPE'] ?? '')[0])) !== 'application/json') answer(415, 'json_required');
    $raw = file_get_contents('php://input', false, null, 0, 8193);
    if ($raw === false || strlen($raw) > 8192) answer(413, 'body_too_large');
    try { $data = json_decode($raw, true, 32, JSON_THROW_ON_ERROR); }
    catch (\JsonException) { answer(400, 'invalid_json'); }
    if (!is_array($data) || array_is_list($data)) answer(400, 'invalid_payload');
    foreach (['name', 'phone', 'product', 'submissionId'] as $field) if (!isset($data[$field]) || !is_string($data[$field])) answer(422, 'invalid_fields');
    if (!empty($data['website'])) answer(400, 'invalid_payload');
    $name = trim(preg_replace('/\s+/u', ' ', $data['name']) ?? '');
    $phone = $data['phone'];
    preg_match_all('/./us', $name, $characters);
    if (count($characters[0]) < 2 || count($characters[0]) > 60 || !preg_match('/^[\p{L}\p{M}\s\x{0027}\x{2019}-]+$/u', $name) || !preg_match('/\p{L}.*\p{L}/u', $name)) answer(422, 'invalid_name');
    if (!preg_match('/^\+7[3489][0-9]{9}$/D', $phone) || preg_match('/^\+7([0-9])\1{9}$/D', $phone)) answer(422, 'invalid_phone');
    $id = strtolower($data['submissionId']);
    if (!preg_match('/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/D', $id)) answer(422, 'invalid_submission');
    if (!is_array($data['consent'] ?? null) || ($data['consent']['accepted'] ?? null) !== true) answer(422, 'consent_required');
    $recordFile = null;
    try {
        $catalog = json_decode(file_get_contents($private . '/catalog.json'), true, 32, JSON_THROW_ON_ERROR);
        $product = $catalog['products'][$data['product']] ?? null;
        if (!$product) answer(422, 'invalid_product');
        if (($data['consent']['version'] ?? '') !== $catalog['consentVersion']) answer(409, 'consent_outdated');
        if (!is_file($private . '/remmil-mail.php')) answer(503, 'mail_unavailable');
        $config = require $private . '/remmil-mail.php';
        foreach (['smtp_host', 'smtp_user', 'smtp_password', 'recipient', 'rate_salt'] as $field) if (!is_string($config[$field] ?? null) || $config[$field] === '') answer(503, 'mail_unavailable');
        if (!filter_var($config['smtp_user'], FILTER_VALIDATE_EMAIL) || !filter_var($config['recipient'], FILTER_VALIDATE_EMAIL)) answer(503, 'mail_unavailable');
        $security = $config['smtp_security'] ?? 'ssl';
        if (!in_array($security, ['ssl', 'tls'], true) && !($security === '' && in_array($config['smtp_host'], ['127.0.0.1', '::1'], true))) answer(503, 'mail_unavailable');
        $storage = $private . '/storage';
        foreach ([$storage, $storage . '/consents', $storage . '/limits'] as $directory) if (!is_dir($directory) && !mkdir($directory, 0700, true) && !is_dir($directory)) throw new \RuntimeException('storage_unavailable');
        $retention = max(1, min(90, (int)($config['retention_days'] ?? 90)));
        cleanup($storage . '/consents', $retention * 86400);
        $window = max(1, (int)($config['rate_window_seconds'] ?? 900));
        cleanup($storage . '/limits', $window);
        $recordPath = $storage . '/consents/' . $id . '.json';
        $recordFile = fopen($recordPath, 'c+');
        if (!$recordFile || !flock($recordFile, LOCK_EX)) throw new \RuntimeException('storage_unavailable');
        chmod($recordPath, 0600);
        $hash = hash('sha256', json_encode([$name, $phone, $data['product'], $catalog['consentVersion']], JSON_UNESCAPED_UNICODE));
        $previous = json_decode(stream_get_contents($recordFile), true);
        if ($previous && ($previous['payloadHash'] ?? '') !== $hash) answer(409, 'submission_conflict');
        if (($previous['status'] ?? '') === 'sent') answer(200, '', ['requestId' => $id]);
        $networkKey = hash_hmac('sha256', $_SERVER['REMOTE_ADDR'] ?? 'unknown', $config['rate_salt']);
        $limitPath = $storage . '/limits/' . $networkKey . '.json';
        $limitFile = fopen($limitPath, 'c+');
        if (!$limitFile || !flock($limitFile, LOCK_EX)) throw new \RuntimeException('storage_unavailable');
        chmod($limitPath, 0600);
        $limit = json_decode(stream_get_contents($limitFile), true) ?: ['start' => time(), 'count' => 0];
        if ($limit['start'] < time() - $window) $limit = ['start' => time(), 'count' => 0];
        if ($limit['count'] >= max(1, (int)($config['rate_limit'] ?? 5))) { fclose($limitFile); answer(429, 'rate_limited'); }
        $limit['count']++;
        jsonWrite($limitFile, $limit);flock($limitFile, LOCK_UN);fclose($limitFile);
        $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
        $requestOrigin = $origin !== '' ? $parts['scheme'] . '://' . $originHost : $scheme . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost');
        $base = rtrim($config['site_url'] ?: $requestOrigin, '/');
        $path = preg_replace('~api/lead\.php(?:\?.*)?$~', 'consent.html', $_SERVER['REQUEST_URI'] ?? '/api/lead.php');
        $document = $config['site_url'] ? $base . '/consent.html' : $base . $path;
        $accepted = gmdate('c');
        $record = ['requestId' => $id, 'name' => $name, 'phone' => $phone, 'product' => $data['product'], 'productName' => $product['name'], 'consent' => ['accepted' => true, 'version' => $catalog['consentVersion'], 'acceptedAt' => $accepted, 'document' => $document], 'payloadHash' => $hash, 'status' => 'pending'];
        jsonWrite($recordFile, $record);
        require_once $private . '/vendor/phpmailer/src/Exception.php';
        require_once $private . '/vendor/phpmailer/src/PHPMailer.php';
        require_once $private . '/vendor/phpmailer/src/SMTP.php';
        $mail = new \PHPMailer\PHPMailer\PHPMailer(true);
        $mail->isSMTP();$mail->Host = $config['smtp_host'];$mail->Port = (int)$config['smtp_port'];
        $mail->SMTPAuth = true;$mail->Username = $config['smtp_user'];$mail->Password = $config['smtp_password'];
        $mail->SMTPSecure = $security;$mail->SMTPAutoTLS = $security !== '';
        $mail->Timeout = 15;$mail->getSMTPInstance()->Timelimit = 20;$mail->SMTPDebug = 0;
        $mail->CharSet = 'UTF-8';$mail->Encoding = 'base64';
        $mail->setFrom($config['smtp_user'], 'REMMIL — заявки с сайта');$mail->addAddress($config['recipient']);
        $mail->Subject = 'Заявка REMMIL — ' . $product['name'];
        $mail->Body = "Новая заявка с сайта REMMIL\n\nИмя: {$name}\nТелефон: {$phone}\nМатериал: {$product['name']}\nФасовка: {$product['packaging']}\nНомер обращения: {$id}\n\nСогласие на обработку персональных данных: дано отдельной отметкой.\nВерсия согласия: {$catalog['consentVersion']}\nВремя регистрации сервером (UTC): {$accepted}\nТекст согласия: {$document}\n";
        $mail->send();
        $record['status'] = 'sent';$record['sentAt'] = gmdate('c');$record['messageId'] = $mail->getLastMessageID();
        jsonWrite($recordFile, $record);flock($recordFile, LOCK_UN);fclose($recordFile);$recordFile = null;
        answer(200, '', ['requestId' => $id]);
    } catch (\Throwable $error) {
        if (is_resource($recordFile)) {
            if (isset($record) && ($record['status'] ?? '') !== 'sent') {
                $record['status'] = 'failed';$record['failedAt'] = gmdate('c');
                try { jsonWrite($recordFile, $record); } catch (\Throwable) { /* Preserve the original delivery failure. */ }
            }
            flock($recordFile, LOCK_UN);fclose($recordFile);
        }
        // Do not log contact information, SMTP credentials or the SMTP conversation.
        error_log('REMMIL lead delivery failed; request=' . $id);
        answer(503, 'mail_unavailable');
    }
}
