# قرارداد API اپلیکیشن موبایل

این فایل قرارداد ارتباط اپلیکیشن موبایل با وب‌سایت است. API داخل همین پروژه‌ی Next.js قرار دارد و روی همان دامنه‌ی Vercel منتشر می‌شود.

## آدرس پایه

در Production:

```text
https://YOUR_DOMAIN/api/v1
```

در Preview:

```text
https://YOUR_PROJECT-<branch>.vercel.app/api/v1
```

آدرس را در تنظیمات محیطی اپلیکیشن قرار دهید و در کد هاردکد نکنید.

```text
API_BASE_URL=https://YOUR_DOMAIN/api/v1
```

## راه‌اندازی دسترسی اپلیکیشن

1. با حساب مدیر وارد وب‌سایت شوید.
2. به `/admin/api-clients` بروید.
3. یک Client بسازید و Scopeهای لازم را انتخاب کنید.
4. کلید نمایش‌داده‌شده را فقط همان لحظه کپی کنید؛ کلید خام دوباره قابل مشاهده نیست.
5. کلید را در تنظیمات امن Build اپلیکیشن قرار دهید.

در Production متغیر `MOBILE_API_REQUIRE_KEY=1` فعال باشد. در این حالت همه‌ی درخواست‌های `/api/v1` به‌جز `meta` باید Header زیر را داشته باشند:

```http
X-API-Key: film_...
```

کلید اپلیکیشن یک شناسه و مجوز مصرف API است، نه هویت کاربر. چون کلید داخل برنامه‌ی موبایل قابل استخراج است، برای حفاظت از حساب یا محتوای پولی به‌تنهایی کافی نیست.

## Headerهای عمومی

```http
Accept: application/json
Content-Type: application/json
X-API-Key: film_...
```

در endpointهای کاربر:

```http
Authorization: Bearer ACCESS_TOKEN
```

همه‌ی پاسخ‌ها ساختار زیر را دارند:

```json
{
  "data": {},
  "meta": { "requestId": "..." },
  "error": null
}
```

در خطا:

```json
{
  "data": null,
  "meta": { "requestId": "..." },
  "error": {
    "code": "AUTH_REQUIRED",
    "message": "برای این درخواست وارد حساب شوید."
  }
}
```

`requestId` را در گزارش خطای اپلیکیشن نگه دارید تا پشتیبانی بتواند درخواست را در لاگ Vercel پیدا کند.

## احراز هویت کاربر

### ثبت‌نام

```http
POST /auth/register
```

```json
{
  "name": "نام کاربر",
  "email": "user@example.com",
  "password": "حداقل-۸-کاراکتر"
}
```

پاسخ موفق شامل `user` و دو توکن است:

```json
{
  "data": {
    "user": {
      "id": "...",
      "name": "نام کاربر",
      "email": "user@example.com",
      "role": "USER",
      "status": "ACTIVE"
    },
    "tokens": {
      "tokenType": "Bearer",
      "accessToken": "...",
      "refreshToken": "...",
      "accessTokenExpiresAt": "2026-07-20T12:00:00.000Z",
      "refreshTokenExpiresAt": "2026-10-18T12:00:00.000Z"
    }
  },
  "meta": { "requestId": "..." },
  "error": null
}
```

اولین کاربر ثبت‌شده در دیتابیس طبق رفتار فعلی سایت `ADMIN` می‌شود؛ بعد از آن کاربران `USER` هستند.

### ورود

```http
POST /auth/login
```

```json
{
  "email": "user@example.com",
  "password": "حداقل-۸-کاراکتر"
}
```

### نوسازی Access Token

Access Token کوتاه‌مدت است. وقتی پاسخ `401` با کد `AUTH_REQUIRED` گرفتید:

```http
POST /auth/refresh
```

```json
{ "refreshToken": "..." }
```

Refresh Token به‌صورت Rotation مصرف می‌شود؛ بعد از موفقیت، Refresh Token قبلی را دور بیندازید و مقدار جدید را ذخیره کنید.

### خروج

```http
POST /auth/logout
Authorization: Bearer ACCESS_TOKEN
```

```json
{ "refreshToken": "..." }
```

خروج idempotent است و اگر توکن قبلاً باطل شده باشد، برنامه می‌تواند بدون خطای جدی به صفحه ورود برگردد.

### کاربر فعلی

```http
GET /me
Authorization: Bearer ACCESS_TOKEN
```

## Endpointهای محتوا

| متد | مسیر | Scope | توضیح |
|---|---|---|---|
| GET | `/meta` | عمومی | نسخه API، قابلیت‌ها و تفاوت providerها |
| GET | `/home?offset=0&limit=6` | Client | سکشن‌های خانه |
| GET | `/catalog?type=movie&page=1` | `catalog:read` | فهرست فیلم یا سریال |
| GET | `/catalog?type=series&provider=b&dubbed=1` | `catalog:read` | فیلتر provider/دوبله/زیرنویس |
| GET | `/search?q=...&limit=30` | `catalog:read` | جست‌وجوی همه یا یک provider |
| GET | `/categories` | `catalog:read` | ژانرها و نگاشت providerها |
| GET | `/countries` | `catalog:read` | کشورها و نگاشت providerها |
| GET | `/kids` | `catalog:read` | محتوای کودک |
| GET | `/sections/{provider}/{id}?page=1` | `catalog:read` | جزئیات یک سکشن |
| GET | `/media/{provider}/{type}/{id}` | `catalog:read` | جزئیات فیلم/سریال و قسمت‌ها |
| GET/POST | `/playback` | `playback:read` + کاربر | لینک‌های پخش مستقیم |
| GET | `/me/favorites` | `profile:read` | فهرست علاقه‌مندی‌ها |
| PUT/DELETE | `/me/favorites` | `profile:write` | ثبت یا حذف علاقه‌مندی |
| GET | `/me/progress` | `profile:read` | ادامه تماشا |
| PUT | `/me/progress` | `profile:write` | ذخیره موقعیت پخش |

در پاسخ‌های محتوایی، URL تصاویر برای موبایل absolute هستند. از `provider` واقعی (`shabforoosh`، `gapfilm`، `filimo`) یا کد عمومی آن استفاده کنید:

```text
a = shabforoosh
b = gapfilm
c = filimo
```

## جزئیات سریال و انتخاب قسمت

```http
GET /media/c/series/SERIES_ID
```

در `data.media.episodes`، هر قسمت این فیلدها را دارد:

```json
{
  "season": 1,
  "episode": 4,
  "title": "قسمت ۴",
  "playbackId": "PROVIDER_EPISODE_ID",
  "links": [],
  "poster": "https://..."
}
```

برای Filimo مقدار `playbackId` مهم است؛ `links` قسمت‌های Filimo ممکن است خالی باشد و لینک واقعی باید با endpoint `/playback` در لحظه دریافت شود.

## پخش مستقیم

### درخواست پیشنهادی

```http
POST /playback
X-API-Key: film_...
Authorization: Bearer ACCESS_TOKEN
Content-Type: application/json
```

فیلم:

```json
{
  "provider": "b",
  "type": "movie",
  "id": "MOVIE_ID",
  "dubbed": "0"
}
```

قسمت سریال:

```json
{
  "provider": "c",
  "type": "series",
  "id": "SERIES_ID",
  "playbackId": "FILIMO_EPISODE_ID",
  "season": "1",
  "episode": "4",
  "dubbed": "0"
}
```

پاسخ نمونه:

```json
{
  "data": {
    "provider": "gapfilm",
    "type": "movie",
    "id": "MOVIE_ID",
    "delivery": "direct",
    "playback": {
      "poster": "https://...",
      "sources": [
        {
          "quality": "1080",
          "src": "https://provider.example/video/master.m3u8",
          "type": "application/vnd.apple.mpegurl",
          "delivery": "direct",
          "dubbed": false,
          "subtitleFa": "https://..."
        }
      ]
    }
  },
  "meta": { "requestId": "..." },
  "error": null
}
```

فیلد `src` لینک اصلی provider است و باید مستقیماً به Player native داده شود. نیازی به دانلود فایل یا ارسال ویدیو از اپلیکیشن به سرور نیست.

### تشخیص نوع Player

- `type` شامل `mpegurl` یا پسوند `.m3u8`: از HLS Player استفاده کنید.
- `type` برابر `video/mp4` یا پسوند `.mp4`: از Player معمولی MP4 استفاده کنید.
- در Android برای HLS از ExoPlayer/Media3 و در iOS از AVPlayer استفاده شود.
- `sources` را بر اساس `quality` مرتب کنید و اگر کیفیت انتخابی شکست خورد، منبع بعدی را امتحان کنید.
- اگر `subtitleFa` یا `subtitleEn` وجود داشت، آن را به عنوان WebVTT جداگانه به Player بدهید؛ آن را به URL ویدیو نچسبانید.

## تفاوت providerهای پخش

### Shabforoosh (`a`)

- لینک‌های فیلم و قسمت معمولاً مستقیم MP4 یا HLS هستند.
- برای سریال باید `season` و `episode` ارسال شود.
- `src` معمولاً بدون Header خاص قابل پخش است.
- در صورت نبودن پاسخ MAPI، سرویس از صفحه HTML پخش fallback می‌گیرد.

### GapFilm (`b`)

- لینک‌ها از Attachmentهای provider گرفته می‌شوند.
- کیفیت‌های مختلف و زیرنویس فارسی/انگلیسی ممکن است در یک Attachment باشند.
- برای سریال، `season` برای انتخاب Season provider استفاده می‌شود و `episode` قسمت را مشخص می‌کند.
- `src` لینک مستقیم فایل Attachment است؛ MP4 و HLS هر دو ممکن هستند.
- اگر چند source برگشت، کیفیت بالاتر را پیش‌فرض انتخاب کنید.

### Filimo (`c`) — مهم

- Filimo مانند دو provider دیگر نیست؛ برای گرفتن لینک پخش، Backend باید با توکن و Headerهای مخصوص خود به API Filimo درخواست بزند.
- برای قسمت سریال، از `playbackId` موجود در `episodes` استفاده کنید؛ فقط `id` سریال کافی نیست.
- Filimo معمولاً HLS می‌دهد. Backend master playlist را برای استخراج کیفیت‌ها بررسی می‌کند.
- در API موبایل، `src` لینک مستقیم Filimo است تا native player آن را مستقیماً باز کند.
- ممکن است به Header زیر احتیاج باشد:

```http
Referer: https://www.filimo.com/
```

- اگر Player موبایل امکان ارسال Referer یا Header سفارشی دارد، مقدار `requiredHeaders` را استفاده کنید.
- در صورت شکست لینک مستقیم، `proxySrc` که در پاسخ Filimo برمی‌گردد fallback همان دامنه است. این fallback برای زمانی است که CDN Filimo پخش مستقیم را به‌دلیل Referer/CORS رد کند.
- توکن احراز هویت Filimo هرگز نباید در اپلیکیشن موبایل، log، README یا پاسخ API ارسال شود؛ فقط روی Vercel به‌صورت Secret Environment Variable بماند.
- برای HLS، همه‌ی segmentها باید از همان URL و با همان سیاست Header پخش شوند؛ فقط URL فایل master را تست نکنید.

نمونه source مخصوص Filimo:

```json
{
  "quality": "1080",
  "src": "https://filimo-cdn.example/master-1080.m3u8",
  "proxySrc": "https://YOUR_DOMAIN/api/provider-media?url=...",
  "type": "application/vnd.apple.mpegurl",
  "delivery": "direct",
  "requiredHeaders": {
    "Referer": "https://www.filimo.com/"
  }
}
```

## علاقه‌مندی و ادامه تماشا

ثبت علاقه‌مندی:

```http
PUT /me/favorites
Authorization: Bearer ACCESS_TOKEN
```

```json
{
  "provider": "b",
  "type": "movie",
  "id": "MOVIE_ID",
  "title": "عنوان فیلم",
  "poster": "https://...",
  "favorite": true
}
```

ذخیره پیشرفت:

```http
PUT /me/progress
Authorization: Bearer ACCESS_TOKEN
```

```json
{
  "provider": "c",
  "type": "series",
  "id": "SERIES_ID",
  "season": "1",
  "episode": "4",
  "title": "قسمت ۴",
  "poster": "https://...",
  "progressSeconds": 1250,
  "durationSeconds": 3480
}
```

ذخیره پیشرفت را با debounce انجام دهید؛ مثلاً هر ۱۰ تا ۱۵ ثانیه و هنگام pause/background، نه در هر تغییر میلی‌ثانیه‌ای Slider.

## نگهداری توکن در اپلیکیشن

- Access Token و Refresh Token را در SharedPreferences یا فایل معمولی ذخیره نکنید.
- Android: Android Keystore / Encrypted DataStore.
- iOS: Keychain.
- Access Token را فقط در حافظه نگه دارید و در شروع برنامه با Refresh Token تمدید کنید.
- در پاسخ 401 ابتدا refresh را یک‌بار انجام دهید؛ اگر refresh هم 401 بود، هر دو توکن را پاک و کاربر را به Login ببرید.
- توکن‌ها را در Crash Report، Analytics و log چاپ نکنید.

## کدهای خطای مهم

```text
API_KEY_REQUIRED
API_KEY_INVALID
AUTH_REQUIRED
INVALID_CREDENTIALS
USER_EXISTS
REFRESH_TOKEN_EXPIRED
ACCOUNT_UNAVAILABLE
INVALID_PLAYBACK_REQUEST
PLAYBACK_UNAVAILABLE
MEDIA_UNAVAILABLE
CATALOG_UNAVAILABLE
```

## تست تحویل

- [ ] Login و Register با API Key روی Production تست شد.
- [ ] Refresh Token Rotation تست شد.
- [ ] Logout، حذف Refresh Token و ورود دوباره تست شد.
- [ ] فیلم MP4 از هر سه provider تست شد.
- [ ] HLS از هر سه provider تست شد.
- [ ] سریال با season/episode تست شد.
- [ ] سریال Filimo با `playbackId` قسمت تست شد.
- [ ] Filimo با لینک مستقیم و سپس `proxySrc` fallback تست شد.
- [ ] زیرنویس فارسی و انگلیسی تست شد.
- [ ] ادامه تماشا بعد از بستن و بازکردن برنامه تست شد.
- [ ] لغو API Client از `/admin/api-clients` باعث خطای `API_KEY_INVALID` شد.
- [ ] هیچ Secret مربوط به provider داخل اپلیکیشن یا log قرار نگرفت.

## دیتابیس و Vercel

بعد از تنظیم `DATABASE_URL` روی Neon، یک بار اجرا شود:

```bash
npm run db:init
```

روی Vercel این متغیرها را برای Production تنظیم کنید:

```text
DATABASE_URL=...
FILIMO_BASE_URL=...
FILIMO_AUTH_TOKEN=...
PROVIDER_HTTP_PROXY=...
MOBILE_API_REQUIRE_KEY=1
MOBILE_MIN_VERSION=1.0.0
MOBILE_MAINTENANCE=0
```

مقادیر Secret را فقط در تنظیمات Vercel قرار دهید و بعد از تغییر، Deployment جدید بسازید.
