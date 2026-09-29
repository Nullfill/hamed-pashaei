<?php
/**
 * =========================================================================
 * Filimchi Iranian Host API Gateway / Proxy (گیتوی پروایدرهای فیلمچی)
 * =========================================================================
 * 
 * این اسکریپت سبک PHP روی هاست اشتراکی دایرکتادمین ایران شما آپلود میشود.
 * هدف: به دلیل داشتن آیپی ایران، وبسرویسهای فیلیمو و گپفیلم کاتالوگ کامل
 * و اصلی ایران را برمیگردانند و محدودیتهای VPN و خارج از کشور را دور میزند.
 * 
 * مصرف ترافیک و پردازنده:
 * فقط دیتای متنی و JSON (چند کیلوبایت) از این هاست رد میشود و استریمهای
 * سنگین ویدیو (mp4 / ts) مستقیماً از CDN پخش میشوند. بنابراین هیچ فشاری
 * به هاست دایرکتادمین شما نخواهد آمد.
 */

// ۱. تنظیم هدرهای CORS برای ارتباط مستقیم اپلیکیشن موبایل و وب
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Proxy-Secret, useragent, jsontype, Referer, x-source-p, platformtype, SourceEnvironment");
header("Access-Control-Max-Age: 86400");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit(0);
}

// ۲. کلید امنیتی (برای جلوگیری از سوءاستفاده افراد متفرقه از هاست شما)
// میتوانید این مقدار را با یک رشته دلخواه عوض کنید
define('GATEWAY_SECRET', 'filimchi-secret-2026');

$clientSecret = $_SERVER['HTTP_X_PROXY_SECRET'] ?? $_GET['secret'] ?? '';
if ($clientSecret !== GATEWAY_SECRET) {
    http_response_code(403);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'success' => false,
        'error' => 'دسترسی غیرمجاز: کلید امنیتی پروکسی اشتباه است.'
    ], JSON_UNESCAPED_UNICODE);
    exit(0);
}

// ۳. دریافت آدرس مقصد (Target URL)
$targetUrl = $_GET['url'] ?? '';
if (empty($targetUrl)) {
    http_response_code(400);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'success' => false,
        'error' => 'پارامتر url الزامی است.'
    ], JSON_UNESCAPED_UNICODE);
    exit(0);
}

// ۴. لیست سفید دامنهها (امنیت و جلوگیری از SSRF)
$parsedTarget = parse_url($targetUrl);
$host = strtolower($parsedTarget['host'] ?? '');

$allowedHosts = [
    'www.filimo.com',
    'api.filimo.com',
    'core.gapfilm.ir',
    'gapfilm.ir',
    'shabforoosh.ir',
    'api.sheyda.com',
    'mikasa.sheyda.com'
];

$isAllowed = false;
foreach ($allowedHosts as $allowed) {
    if ($host === $allowed || str_ends_with($host, '.' . $allowed)) {
        $isAllowed = true;
        break;
    }
}

if (!$isAllowed) {
    http_response_code(403);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'success' => false,
        'error' => 'دامنه مقصد در لیست سفید مجاز نیست: ' . htmlspecialchars($host)
    ], JSON_UNESCAPED_UNICODE);
    exit(0);
}

// ۵. آمادهسازی هدرها و درخواست cURL
$method = $_SERVER['REQUEST_METHOD'];
$body = file_get_contents('php://input');

$requestHeaders = [];
$incomingHeaders = getallheaders();

// هدرهای ضروری برای فیلیمو و گپفیلم (اصلاح شد: cookie و user-agent و referer اضافه شدند)
$forwardHeaderNames = [
    'authorization',
    'cookie',
    'user-agent',
    'useragent',
    'jsontype',
    'content-type',
    'accept',
    'referer',
    'x-source-p',
    'platformtype',
    'sourceenvironment',
    'x-forwarded-for',
    'x-real-ip',
    'client-ip'
];

foreach ($incomingHeaders as $name => $value) {
    $lowerName = strtolower($name);
    if (in_array($lowerName, $forwardHeaderNames, true)) {
        $requestHeaders[] = "{$name}: {$value}";
    }
}

// تنظیم پیشفرض هدرها در صورت نبود
if (!isset($incomingHeaders['Accept']) && !isset($incomingHeaders['accept'])) {
    $requestHeaders[] = 'Accept: application/json';
}
if (!isset($incomingHeaders['User-Agent']) && !isset($incomingHeaders['user-agent'])) {
    $requestHeaders[] = 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
}

// برای فیلیمو Referer و کوکی‌های احراز هویت وب ست می‌شود
if (strpos($host, 'filimo.com') !== false) {
    $requestHeaders[] = 'Referer: https://www.filimo.com/';
    $authHeader = $incomingHeaders['Authorization'] ?? $incomingHeaders['authorization'] ?? '';
    if (preg_match('/Bearer\s+(.+)/i', $authHeader, $matches)) {
        $jwtToken = trim($matches[1]);
        if (!isset($incomingHeaders['Cookie']) && !isset($incomingHeaders['cookie'])) {
            $requestHeaders[] = "Cookie: token={$jwtToken}; asp_auth={$jwtToken};";
        }
    }
} elseif (strpos($host, 'gapfilm.ir') !== false) {
    $requestHeaders[] = 'Origin: https://www.gapfilm.ir';
    $requestHeaders[] = 'Referer: https://www.gapfilm.ir/';
}

// ۶. اجرای درخواست توسط cURL از طریق آیپی سرور ایران
$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL => $targetUrl,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CUSTOMREQUEST => $method,
    CURLOPT_HTTPHEADER => $requestHeaders,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_MAXREDIRS => 5,
    CURLOPT_TIMEOUT => 20,
    CURLOPT_CONNECTTIMEOUT => 7,
    CURLOPT_SSL_VERIFYPEER => false,
    CURLOPT_SSL_VERIFYHOST => 0,
    CURLOPT_ENCODING => '' // پشتیبانی خودکار از gzip / deflate
]);

if ($method === 'POST' || $method === 'PUT') {
    curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
}

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
$curlError = curl_error($ch);
curl_close($ch);

if ($response === false) {
    http_response_code(502);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'success' => false,
        'error' => 'خطا در برقراری ارتباط از هاست ایران: ' . $curlError
    ], JSON_UNESCAPED_UNICODE);
    exit(0);
}

// ۷. ارسال پاسخ به کلاینت (اپلیکیشن یا وب)
http_response_code($httpCode ?: 200);
if ($contentType) {
    header("Content-Type: {$contentType}");
} else {
    header("Content-Type: application/json; charset=utf-8");
}

echo $response;