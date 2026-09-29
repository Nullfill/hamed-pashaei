# 🎬 پرامپت اختصاصی ساخت اپلیکیشن کلاینت مستقیم فیلمچی (Standalone Multi-Provider Client) برای Google AI Studio

> **راهنمای استفاده:** کل متن Markdown زیر را کپی کرده و به عنوان System Prompt یا User Prompt در **Google AI Studio** قرار دهید. این پرامپت به هوش مصنوعی می‌گوید یک اپلیکیشن کامل موبایل (Flutter یا React Native) بسازد که **مستقیماً و بدون نیاز به هیچ سرور واسطه‌ای** با وب‌سرویس‌های ۴ پروایدر ایرانی (**Gapfilm, Shabforoosh, Sheyda, Filimo**) ارتباط برقرار کند.

---

```markdown
# Role & Project Scope
You are a Principal Mobile Architect and Senior Flutter/React Native Developer.
Your task is to build a standalone, zero-server-dependency, production-grade video streaming application named **"فیلمچی" (Filimchi)**.
The app runs on Iranian user devices and communicates **DIRECTLY** with the public REST and GraphQL APIs of 4 Iranian streaming platforms (**Gapfilm, Shabforoosh, Sheyda, Filimo**), eliminating all server/proxy bottlenecks and ensuring full native speeds with Iranian ISP IPs.

---

## 🎨 Design System & UI Specifications
- **Theme:** Cinematic OLED Black (`#07070a`). Surface cards: `#13131c`. Border accent: `#222233`.
- **Accent Colors:** Electric Amber / Cinema Gold (`#f5c518`) and Crimson Red (`#e50914`).
- **Typography:** Fully RTL (Right-to-Left) with Persian Font (`Vazirmatn`).
- **Navigation:**
  - 🏠 **خانه (Home):** Netflix-style Hero Slider + Horizontal Rails grouped by Provider or Unified Sections (برترین‌ها، تازه دوبله شده، سریال‌ها، کارتون).
  - 🔍 **جستجو (Search):** Unified Search Bar querying all 4 providers simultaneously and displaying combined results with Provider Badges.
  - 📂 **دسته‌بندی‌ها (Categories):** Filter by Genre (اکشن، کمدی، انیمیشن، درام، ترسناک) and Type (فیلم / سریال).
  - 👶 **کودک (Kids Mode):** Colorful rail interface with Persian dubbed animations.
  - ⭐ **علاقه‌مندی‌ها و تاریخچه (Favorites & History):** Offline local storage using Hive / SharedPreferences / SQLite.

---

## 🛠️ Direct Provider APIs & Reverse-Engineered Contracts

### 1. شب‌فروش (Shabforoosh Provider) — Verified REST API
- **Base URL:** `https://shabforoosh.ir`
- **Default Headers (Required for all calls):**
  ```http
  Accept: application/json
  Accept-Language: fa-IR,fa;q=0.9,en-US;q=0.8
  Referer: https://shabforoosh.ir/
  User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36
  ```

#### اندپوینت‌های تاییدشده و دقیق Shabforoosh:
1. **صفحه اصلی و اسلایدرها (Home Feed):**
   - `GET https://shabforoosh.ir/wp-json/mapi/v1/post/all`
   - Response:
     ```json
     {
       "success": true,
       "data": {
         "sliders": [{ "id": 123, "title": "...", "image": "...", "type": "movie" }],
         "latest": [{ "id": 124, "title": "...", "image": "...", "imdb_rate": "7.5" }],
         "series": [...],
         "cartoons": [...]
       }
     }
     ```
2. **ریل پیشنهادی‌ها و کارتون‌ها (Pagination Support):**
   - `GET https://shabforoosh.ir/wp-json/mapi/v1/post/suggestions?page=1&per_page=20`
   - `GET https://shabforoosh.ir/wp-json/mapi/v1/post/cartoons?page=1&per_page=20`
3. **کاتالوگ فیلم‌ها با فیلتر (Movies Archive):**
   - `GET https://shabforoosh.ir/wp-json/mapi/v1/post/movies?page=1&per_page=20&genres={genreId}&country={countryId}&dubbed=1&subtitle=1`
4. **کاتالوگ سریال‌ها با فیلتر (Series Archive):**
   - `GET https://shabforoosh.ir/wp-json/mapi/v1/post/series?page=1&per_page=20&genres={genreId}&country={countryId}&dubbed=1&subtitle=1`
5. **جستجوی دقیق شب‌فروش (Search):**
   - `GET https://shabforoosh.ir/wp-json/mapi/v1/post/search?search={query}`
   - Response:
     ```json
     {
       "success": true,
       "data": [
         {
           "id": 170291,
           "type": "serie", // or "movie"
           "title": "انیمیشن Batman: Caped Crusader",
           "fa_title": "بتمن: شوالیه شنل‌پوش",
           "image": "https://shabforoosh.ir/wp-content/uploads/...",
           "background_image": "https://...",
           "imdb_rate": "7.2",
           "release": "2024",
           "has_dubbed": "on",
           "has_subtitle": "on"
         }
       ]
     }
     ```
6. **جزئیات فیلم یا سریال (Post Details):**
   - `GET https://shabforoosh.ir/wp-json/mapi/v1/post/{id}`
   - فیلدهای بازگشتی:
     - `data.id`, `data.title`, `data.fa_title`, `data.fa_plot`, `data.en_plot`
     - `data.image` (پوستر), `data.background_image` (بک‌دراپ)
     - `data.genres[]`, `data.actors[]`, `data.directors[]`
     - `data.trailer` (لینک مستقیم فایل MP4 تریلر)
     - **برای فیلم‌ها (Direct Play):** فیلد `data.download_links` شامل آرایه‌ای از کیفیت‌ها:
       ```json
       [
         {
           "dl_link": "https://dl20.acenteri.ir/.../Grand.Theft.Auto.1977.DVDRip.Dubbed.mp4",
           "quality_link": "1080p",
           "link_type": "dub", // "dub" (دوبله) یا "sub" (زیرنویس)
           "dl_capacity": "1.31 GigaByte"
         }
       ]
       ```
7. **پخش مستقیم قسمت سریال‌ها (Series Episode Playback):**
   - `GET https://shabforoosh.ir/wp-json/mapi/v1/post/{id}/season/{seasonNumber}/episode/{episodeNumber}`
   - Response:
     ```json
     {
       "success": true,
       "data": {
         "download_links": {
           "WEB-DL 1080p": {
             "title": "Episode 1",
             "link": "https://dl10.acenteri.ir/.../S01E01.1080p.mp4",
             "subtitle": "https://dl10.acenteri.ir/.../S01E01.srt"
           },
           "WEB-DL 720p": {
             "title": "Episode 1",
             "link": "https://dl10.acenteri.ir/.../S01E01.720p.mp4",
             "subtitle": "https://dl10.acenteri.ir/.../S01E01.srt"
           }
         }
       }
     }
     ```

---

### 2. گپ‌فیلم (Gapfilm Provider) — Direct REST API
- **Base URL:** `https://core.gapfilm.ir`
- **Default Headers:**
  ```http
  Accept: */*
  Accept-Language: fa-IR,fa;q=0.9,en-US;q=0.8
  Content-Type: application/json
  Origin: https://www.gapfilm.ir
  Referer: https://www.gapfilm.ir/
  PlatformType: Web
  User-Agent: Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36
  ```

#### اندپوینت‌های اصلی Gapfilm:
1. **صفحه اصلی و بخش‌ها (Home Sections):**
   - `GET https://core.gapfilm.ir/api/v3.3/GetFirstPageByPlatform?PlatformId=1&PageSize=20&PageIndex=0&ContentRows=11`
   - Response: `Result.Sections[]` شامل `Title`, `Contents[]` (با `ContentID`, `Title`, `EnglishBody`, `Summary`, `Poster`, `ZoneID`).
2. **جستجوی مستقیم (Search):**
   - `GET https://core.gapfilm.ir/api/v1.0/search?Title={query}&PageIndex=0&PageSize=20`
   - Response: `Contents[]` -> نگاشت به MediaItem (`id: ContentID`, `title: Title`, `type: Type == 1 ? "movie" : "series"`).
3. **جزئیات فیلم یا سریال (Content Details):**
   - `GET https://core.gapfilm.ir/api/v4/Content/GetContent?Id={contentId}`
   - Header الزامی: `SourceEnvironment: Website`
   - Response: `Result` شامل `Title`, `Summary`, `Body`, فیلدهای `IMDB`, `ژانر`, `سال`, و `SeasonList[]`.
4. **لینک‌های پخش مستقیم و زیرنویس (Playback & Stream Links):**
   - `GET https://core.gapfilm.ir/api/v4/Content/GetContentAttachments?Id={contentId}&seasonId={seasonId}&generateLink=true`
   - Header الزامی: `SourceEnvironment: Website`
   - Response: `Result.Attachments[]`
     - `attachment.Files[]`:
       - `file.Type == 7 || 8 || 9`: آدرس استریم ویدیو (`file.Path` - یا `.m3u8` چند کیفیته HLS یا مستقیم `.mp4`).
       - `file.Width`: رزولوشن (`>= 1900` -> 1080p, `>= 1200` -> 720p, `>= 800` -> 480p).
       - `file.Type == 3`: فایل زیرنویس (`file.Path` - فرمت VTT/SRT فارسی و انگلیسی).
       - `attachment.IsDubbed`: بولین برای مشخص کردن صوت دوبله فارسی.
5. **دسته‌بندی‌های گپ‌فیلم (Categories):**
   - `POST https://core.gapfilm.ir/api/v1.0/GetCategoryList`
   - Body: `{"request": {"requestId": -1}}`

---

### 3. شیدا (Sheyda Provider) — Direct GraphQL API
- **Endpoint:** `https://api.sheyda.com/query`
- **Auth Endpoint:** `https://mikasa.sheyda.com/graphql`
- **Headers:**
  ```http
  Content-Type: application/json
  Accept: application/json
  x-source-p: 202314
  User-Agent: Mozilla/5.0 (Sheyda TV compatible provider)
  ```

#### کوئری‌های اصلی Sheyda:
1. **صفحه اصلی (Home Layout):**
   ```graphql
   query getPageLayout($pageID: String!) {
     getPageLayout(pageID: $pageID) {
       status { statusCode message }
       data { rows { title link type order dataType itemType itemID } }
     }
   }
   ```
2. **جستجو (Search):**
   ```graphql
   query search($query: String!, $page: Int!) {
     search(query: $query, page: $page) {
       status { statusCode message }
       data {
         titleMatch { id uid title summary portraitImagePath landscapeImagePath type }
       }
     }
   }
   ```
3. **جزئیات فیلم و پخش (Program Details & Playback):**
   ```graphql
   query getProgramByUid($uid: String!) {
     getProgramByUid(uid: $uid) {
       data {
         program { id uid title summary productionYear genres { id name } }
         cast { artists { id fullName imagePath } }
         seasons { id title }
         solitaryEpisode { id uid title playLinkURI }
       }
     }
   }
   ```

---

### 4. فیلیمو (Filimo Provider) — Direct JSON API
- **Base URL:** `https://www.filimo.com/api/fa/v1/` or `https://api.filimo.com/api/fa/v1/`
- **Headers:**
  ```http
  Accept: application/json
  Accept-Language: fa-IR,fa;q=0.9
  Referer: https://www.filimo.com/
  useragent: {"os":"react","pf":"site"}
  jsonType: simple
  User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36
  ```

#### اندپوینت‌های اصلی Filimo:
1. **جستجوی عمومی (بدون توکن):**
   - `GET https://www.filimo.com/api/fa/v1/movie/movie/list/tagid/1000300/text/{query}`
   - لیست فیلم‌ها و سریال‌های مرتبط را بازمی‌گرداند.
2. **دسته‌بندی‌های فیلیمو:**
   - `GET https://www.filimo.com/api/fa/v1/menu/menu/category`
3. **فصل‌ها و قسمت‌های سریال:**
   - `GET https://www.filimo.com/api/fa/v1/movie/serial/allseason/uid/{uid}`
   - فصول سریال را همراه با `episodes_link` بازمی‌گرداند.
4. **پخش مستقیم (Playback Stream):**
   - `GET https://www.filimo.com/api/fa/v1/movie/watch/watch/uid/{uid}`
   - Header: `Authorization: Bearer <FILIMO_TOKEN>` (توکن ذخیره‌شده به صورت امن در تنظیمات کاربر).
   - پاسخ حاوی `data.multiSRC` با فایل Master Playlist HLS (`.m3u8`) است.
   - **هدر الزامی پلیر برای فیلیمو:** در زمان پخش استریم‌های فیلیمو، پلیر نیتیو باید هدر زیر را روی درخواست استریم بفرستد:
     `Referer: https://www.filimo.com/`

---

## 📺 Advanced Native Video Player Requirements
یک پلیر بومی تمام‌عیار (با `media_kit` یا `better_player` برای Flutter یا `react-native-video`) پیاده‌سازی کنید:
1. **پخش چند کیفیته HLS و MP4 مستقیم:**
   - برای گپ‌فیلم و فیلیمو: سوییچ بین رزولوشن‌های 1080p, 720p, 480p بر اساس فایل `.m3u8`.
   - برای شب‌فروش: پخش مستقیم فایل‌های `.mp4` سرعت بالا از سرورهای CDN (`acenteri.ir`).
2. **سوییچ ترک صوتی دوبله و زبان اصلی:**
   - امکان تغییر زبان از دوبله فارسی (`دوبله فارسی`) به صدای زبان اصلی با حفظ سینک زمانی.
3. **زیرنویس هماهنگ فارسی و انگلیسی:**
   - پشتیبانی از زیرنویس‌های اکسترنال VTT و SRT استخراج‌شده از گپ‌فیلم و شب‌فروش با قابلیت تغییر سایز فونت.
4. **ژست‌های حرکتی و ذخیره تایم تماشا:**
   - کشیدن انگشت سمت راست صفحه برای کم و زیاد کردن صدا (Volume).
   - کشیدن انگشت سمت چپ صفحه برای تنظیم نور صفحه (Brightness).
   - دبل‌تپ برای پرش ۱۰ ثانیه‌ای به جلو و عقب.
   - ذخیره خودکار ثانیه تماشاشده در دیتابیس محلی دستگاه (Local Storage) جهت ادامه تماشا (Resume Watching).

---

## 🏗️ Architecture & Clean Code Structure
- **State Management:** Riverpod 2.x (Flutter) یا Zustand + React Query (React Native).
- **Network Layer:** استفاده از کلاینت تمیز Dio یا Axios با مخازن مجزا برای هر پروایدر:
  - `ShabforooshRepository`
  - `GapfilmRepository`
  - `SheydaRepository`
  - `FilimoRepository`
- **سرویس تجمیع‌کننده سراسری (`UnifiedMediaService`):** نتایج جستجو و دسته‌بندی‌ها را به صورت همزمان از هر ۴ پروایدر فرامی‌خواند و با برچسب منبع نمایش می‌دهد.
- **راست‌چین کامل و زبان فارسی:** تمام متون، دکمه‌ها، پیام‌های خطا و اعداد به صورت فارسی و راست‌چین باشند.
```
