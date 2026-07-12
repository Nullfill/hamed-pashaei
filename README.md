# فیلیمچی

MVP فارسی و راست چین برای نمایش و پخش فیلم و سریال با Next.js App Router. ساختار پروژه Provider محور است تا بعدا بتوانید TMDB، دیتابیس داخلی، Scraper یا API اختصاصی را بدون بازنویسی UI اضافه کنید.

## نصب

```bash
npm install
cp .env.example .env.local
```

در `.env.local` مقدارهای زیر را تنظیم کنید:

```env
SHABFOROOSH_BASE_URL=https://shabforoosh.ir
SHABFOROOSH_COOKIE=PHPSESSID=...; _lscache_vary=...; login_token=...; wordpress_logged_in_...=...
```

Cookie فقط در Server-side fetch استفاده می‌شود. هیچ Route Handler مقدار Cookie یا Headerهای حساس را در response برنمی‌گرداند.

## اجرای محلی

```bash
npm run dev
```

سپس `http://localhost:3000` را باز کنید.

برای تست مستقیم مسیر نمونه:

```txt
http://localhost:3000/movies/546669
```

برای تست API پخش:

```txt
http://localhost:3000/api/playback?type=movie&id=546669&dubbed=0
```

## اسکریپت‌ها

```bash
npm run typecheck
npm run lint
npm run build
```

## Deploy روی Vercel

1. پروژه را به GitHub متصل کنید.
2. در Vercel یک پروژه Next.js بسازید.
3. Environment Variableهای `SHABFOROOSH_BASE_URL` و `SHABFOROOSH_COOKIE` را در Vercel Dashboard تنظیم کنید.
4. Deploy را اجرا کنید.

این پروژه فایل ویدئو را دانلود یا ذخیره نمی‌کند و فقط HTML سبک را سمت سرور fetch و parse می‌کند. لینک‌های ویدئو برای پخش در HTML5 player استفاده می‌شوند.

## معماری Provider

قرارداد اصلی در `src/lib/providers/types.ts` تعریف شده است:

```ts
interface MediaProvider {
  id: string;
  name: string;
  search(query: string): Promise<SearchResult[]>;
  getHomeSections(): Promise<HomeSection[]>;
  getDetails(input: MediaPath): Promise<MediaDetails>;
  getPlayback(input: PlaybackInput): Promise<PlaybackData>;
}
```

Provider فعلی در `src/lib/providers/shabforoosh` قرار دارد:

- `client.ts`: ساخت request سمت سرور و افزودن Cookie از env
- `parsers.ts`: استخراج داده با Cheerio
- `normalizers.ts`: dedupe و utilityهای مخصوص Provider
- `index.ts`: پیاده سازی `ShabforooshProvider`

برای افزودن Provider جدید:

1. یک پوشه جدید در `src/lib/providers/` بسازید.
2. کلاسی مطابق `MediaProvider` پیاده سازی کنید.
3. Provider را در `src/lib/providers/registry.ts` ثبت کنید.
4. UI و Routeها بدون تغییر اساسی می‌توانند از Provider جدید استفاده کنند.

## مسیرها

- `/`: صفحه اصلی با اسلایدر و railها
- `/search`: جستجوی debounce شده
- `/movies/[id]`: جزئیات فیلم
- `/series/[id]`: جزئیات سریال
- `/watch/[type]/[id]`: پخش داخلی
- `/api/search?q=...`: جستجو
- `/api/home`: بخش‌های خانه
- `/api/playback?type=movie&id=544176&dubbed=0`: لینک‌های پخش

## نکات امنیتی

- `SHABFOROOSH_COOKIE` را commit نکنید.
- از `.env.local` برای توسعه محلی و Vercel Environment Variables برای production استفاده کنید.
- در صورت نیاز به proxy ویدئو، فشار bandwidth روی Vercel Free را قبل از فعال سازی بررسی کنید.
