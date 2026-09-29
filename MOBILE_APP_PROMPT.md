# 🎬 پرامپت جامع ساخت اپلیکیشن کلاینت مستقیم «فیلمچی» (Filimchi Standalone Mobile Client) برای Google AI Studio / Cursor

> **راهنمای استفاده:** کل متن انگلیسی زیر (داخل بلوک کُد اصلی) را کپی کرده و به عنوان **System Prompt** یا **User Prompt** در **Google AI Studio** (با مدل Gemini 1.5 Pro یا 2.0 Flash) قرار دهید. این پرامپت طوری مهندسی شده که یک اپلیکیشن موبایل مدرن (Flutter یا React Native) کامل، با طراحی لوکس، صفحه اصلی پر از سکشن‌های متنوع، کارت‌های بصری شگفت‌انگیز برای دسته‌بندی‌ها، ارتباط مستقیم و بدون سرور واسط با وب‌سرویس‌های استریم ایرانی و پنهان‌سازی کامل نام منابع (کاملاً با برند اختصاصی **فیلمچی**) تولید کند.

---

```markdown
# Role & Project Scope
You are a Principal Mobile Architect and Senior Flutter/React Native Engineer.
Your task is to build a standalone, zero-server-dependency, production-grade video streaming application named **"فیلمچی" (Filimchi)**.
The application runs on Iranian mobile devices (Android & iOS) and communicates **DIRECTLY** with the public and authenticated REST/GraphQL endpoints of 4 Iranian streaming engines under the hood.

---

## 🔒 Strict White-Label & Stealth Policy (Zero Provider Names)
1. **Brand Identity:** The application is 100% branded as **"فیلمچی" (Filimchi)**.
2. **Total Provider Name Anonymity:**
   - NEVER expose or display the names "فیلیمو", "گپ فیلم", "شب فروش", "شیدا" or "Filimo", "Gapfilm", "Shabforoosh", "Sheyda" anywhere in the UI, toasts, badges, error messages, or user-facing logs.
   - Streaming sources on detail screens and player quality pickers must be labeled strictly with professional, user-friendly server names:
     - ⚡ **سرور ۱ (کیفیت اصلی / خودکار HLS)**
     - 🎙️ **سرور ۲ (دوبله اختصاصی فیلمچی)**
     - 💎 **سرور ۳ (کیفیت Ultra HD)**
     - 🚀 **سرور ۴ (دانلود پرسرعت مستقیم MP4)**
3. **Internal Code Architecture:**
   - Provider adapters must use neutral internal identifiers: `SourceEngineA`, `SourceEngineB`, `SourceEngineC`, `SourceEngineD` or implement an abstract `MediaSourceAdapter` interface (`engine_a_impl.dart`, `engine_b_impl.dart`, etc.).
   - A centralized `UnifiedCatalogRepository` aggregates, dedupes, and interweaves media items seamlessly into unified rails.

---

## 🎨 Design System & Visual Aesthetics
- **Theme:** Cinematic Midnight OLED (`#07070a`), elevated card surfaces (`#12121a`), border strokes (`#1f1f2e`).
- **Accents:** Electric Cinema Gold (`#f5c518`), Crimson Flame (`#e50914`), Neon Emerald (`#10b981`), Cyber Cyan (`#06b6d4`).
- **Typography:** Fully Right-to-Left (RTL) layout using Persian font **`Vazirmatn`** with weights 300, 400, 600, 700, and 900.
- **Glassmorphism & Micro-Interactions:** Smooth border radius (`16px`), blurred backdrop filters, skeleton shimmering during load, and subtle spring scale (`0.98`) upon tap.

---

## 📱 Navigation & Screen Architecture

The bottom navigation bar contains 5 core destinations:
1. 🏠 **خانه (Home):** Rich multi-section streaming feed with 10+ dynamic rails.
2. 📂 **دسته‌بندی‌ها (Categories):** High-impact visual grid with themed cinematic cards.
3. 🔍 **جستجو (Search):** Real-time unified search with instant debounce and filter pills.
4. 👶 **کودک (Kids Mode):** Colorful, safe animated hub with Persian-dubbed cartoons.
5. 👤 **پروفایل و نشان‌ها (Profile & Library):** Watch history, bookmarked lists, offline downloads, and streaming preferences.

---

### 1. 🏠 صفحه اصلی (Rich Multi-Section Home Feed)
The Home screen must NOT be sparse. It must render an expansive, immersive Netflix/Apple TV+ style experience containing at least **10 distinct rails/sections**:

1. **اسلایدر قهرمان (Hero Showcase Carousel):**
   - Full-bleed vertical/horizontal poster with gradient fade to `#07070a`.
   - Title in Persian calligraphy, IMDb score pill, release year, age rating, and Persian synopsis preview.
   - High-priority badges: `اختصاصی فیلمچی`, `دوبله دو زبانه`, `کیفیت 4K`.
   - Action buttons: "تماشا کنید" (Play) with glowing Gold background + "افزودن به لیست من" (+ My List).
   - Auto-scrolling carousel with smooth pagination dots.
2. **🔥 ۱۰ فیلم و سریال برتر هفته (Top 10 Trending):**
   - Oversized rank numbers (1 to 10) in 3D stylized typography beside each poster card.
3. **🎬 تازه ترین فیلم‌های سینمایی (Latest Premieres):**
   - Vertical poster cards (2:3 aspect ratio) with Persian title, release year, and dubbed icon.
4. **📺 سریال‌های روز و در حال پخش (On-Air Trending Series):**
   - Cards displaying badge: "قسمت جدید اضافه شد" and season indicator.
5. **🎙️ دوبله اختصاصی فیلمچی (Filimchi Exclusive Dubbed):**
   - Content with studio-grade Persian voice acting featuring a golden mic badge.
6. **⭐ شاهکارهای سینما (IMDb Top 250 & Awards):**
   - High-rated films (IMDb 8.0+) with gold rating badges and genre tags.
7. **⚡ اکشن و آدرنالین (Adrenaline & High-Octane Action):**
   - Action, martial arts, and thriller movies.
8. **🎭 کمدی و خنده (Persian & World Comedy):**
   - Iranian comedies, stand-up specials, and international comedy hits.
9. **🚀 جهان علمی-تخیلی و فانتزی (Sci-Fi & Cyberpunk):**
   - Space exploration, superheroes, time travel, and fantasy epics.
10. **👶 سرزمین کارتون و انیمه (Animation & Anime Universe):**
    - High-energy colorful cards featuring family animations and trending anime.
11. **🇰🇷 کی‌دراما و سینمای شرق (Korean Drama Wave):**
    - High-demand Korean, Japanese, and Chinese drama series.
12. **🌍 مستندهای شگفت‌انگیز (World & Nature Documentaries):**
    - 16:9 widescreen landscape cards with crisp photography.

---

### 2. 📂 تب دسته‌بندی‌ها (Gorgeous Visual Category Cards Grid)
The Categories screen must NOT be a plain list or plain chip selector. It must feature a **2-column responsive grid of gorgeous visual cards**:

- **Card Anatomy:**
  - **Aspect Ratio:** 16:10 or 4:3 rounded cards (`border-radius: 16px`).
  - **Backdrop Art:** Real, high-resolution cinematic backdrop photo representing that genre.
  - **Color Accent Glow & Overlay:** A rich dark-to-translucent linear gradient with a genre-specific accent color:
    - **اکشن (Action):** Fiery Amber/Orange (`#FF6B00`)
    - **کمدی (Comedy):** Emerald Green (`#10B981`)
    - **انیمیشن (Animation):** Electric Violet (`#8B5CF6`)
    - **وحشت و ترسناک (Horror):** Crimson Blood (`#DC2626`)
    - **علمی-تخیلی (Sci-Fi):** Neon Cyan (`#06B6D4`)
    - **درام (Drama):** Royal Indigo (`#6366F1`)
    - **عاشقانه (Romance):** Velvet Rose (`#F43F5E`)
    - **جنایی و معمایی (Crime & Mystery):** Slate Dark Cobalt (`#475569`)
    - **مستند (Documentary):** Rainforest Olive (`#059669`)
    - **تاریخی و حماسی (History):** Golden Ochre (`#B45309`)
    - **کودک و نوجوان (Kids):** Vibrant Sunburst (`#FBBF24`)
    - **ماجراجویی (Adventure):** Caribbean Turquoise (`#14B8A6`)
    - **سریال کره‌ای (K-Drama):** Cherry Blossom Magenta (`#EC4899`)
    - **وسترن (Western):** Desert Terracotta (`#9A3412`)
  - **Typography:**
    - Persian Genre Title in bold `Vazirmatn Black 18px`.
    - English Subtitle in elegant muted uppercase (`ACTION`, `COMEDY`, `SCI-FI`).
    - Item Counter Pill: e.g. "+۱,۲۰۰ عنوان" (Over 1,200 titles).
  - **Interaction:**
    - Tapping a card animates into a filtered Archive Grid with infinite scrolling and filter pills (`همه`, `فیلم`, `سریال`, `دوبله فارسی`, `زیرنویس`).

---

## 🛠️ Direct Engine API Contracts (Tested & Reverse-Engineered)

All requests must originate **directly from the user's mobile device** using Iranian ISP IPs to achieve maximum CDN throughput without proxy or server bandwidth costs.

---

### Engine 1: REST API (SourceEngineA — Direct MP4 CDN & Metadata)
- **Base URL:** `https://shabforoosh.ir`
- **Default Headers:**
  ```http
  Accept: application/json
  Accept-Language: fa-IR,fa;q=0.9
  Referer: https://shabforoosh.ir/
  User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36
  ```

#### Endpoints:
1. **Home Feed & Sliders:**
   - `GET https://shabforoosh.ir/wp-json/mapi/v1/post/all`
   - Response: `data.sliders[]`, `data.latest[]`, `data.series[]`, `data.cartoons[]`
2. **Paginated Rails:**
   - `GET https://shabforoosh.ir/wp-json/mapi/v1/post/suggestions?page={page}&per_page=20`
   - `GET https://shabforoosh.ir/wp-json/mapi/v1/post/cartoons?page={page}&per_page=20`
   - `GET https://shabforoosh.ir/wp-json/mapi/v1/post/movies?page={page}&per_page=20&dubbed=1`
   - `GET https://shabforoosh.ir/wp-json/mapi/v1/post/series?page={page}&per_page=20`
3. **Unified Search:**
   - `GET https://shabforoosh.ir/wp-json/mapi/v1/post/search?search={query}`
4. **Movie / Series Details:**
   - `GET https://shabforoosh.ir/wp-json/mapi/v1/post/{id}`
   - Details: `data.title`, `data.fa_title`, `data.fa_plot`, `data.image`, `data.background_image`, `data.imdb_rate`, `data.genres[]`, `data.trailer`
   - Movie Direct Play Links: `data.download_links[]`
     ```json
     [
       {
         "dl_link": "https://dl20.acenteri.ir/.../Movie.1080p.Dubbed.mp4",
         "quality_link": "1080p",
         "link_type": "dub", // "dub" = دوبله, "sub" = زیرنویس
         "dl_capacity": "1.8 GB"
       }
     ]
     ```
5. **Series Episode Direct Stream Links:**
   - `GET https://shabforoosh.ir/wp-json/mapi/v1/post/{id}/season/{seasonNumber}/episode/{episodeNumber}`
   - Returns `data.download_links` with direct fast `.mp4` URLs and `.srt` subtitle links.

---

### Engine 2: REST API (SourceEngineB — Direct HLS & Attachments)
- **Base URL:** `https://core.gapfilm.ir`
- **Default Headers:**
  ```http
  Accept: */*
  Accept-Language: fa-IR,fa;q=0.9
  Content-Type: application/json
  Origin: https://www.gapfilm.ir
  Referer: https://www.gapfilm.ir/
  PlatformType: Web
  User-Agent: Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36
  ```

#### Endpoints:
1. **Home Feed Rails:**
   - `GET https://core.gapfilm.ir/api/v3.3/GetFirstPageByPlatform?PlatformId=1&PageSize=20&PageIndex=0&ContentRows=12`
   - Returns `Result.Sections[]` with rails of movies and series.
2. **Search:**
   - `GET https://core.gapfilm.ir/api/v1.0/search?Title={query}&PageIndex=0&PageSize=20`
3. **Details:**
   - `GET https://core.gapfilm.ir/api/v4/Content/GetContent?Id={contentId}`
   - Header: `SourceEnvironment: Website`
   - Returns `Result.Title`, `Result.Summary`, `Result.IMDB`, `Result.SeasonList[]`.
4. **Playback Stream & Subtitles:**
   - `GET https://core.gapfilm.ir/api/v4/Content/GetContentAttachments?Id={contentId}&seasonId={seasonId}&generateLink=true`
   - Header: `SourceEnvironment: Website`
   - Returns `Result.Attachments[]`:
     - `file.Type == 7 || 8 || 9`: HLS Master Playlist `.m3u8` or MP4 stream (`file.Path`).
     - `file.Type == 3`: External Persian/English Subtitles (`.vtt` / `.srt`).
     - `attachment.IsDubbed`: Boolean for Persian audio voiceover.

---

### Engine 3: GraphQL API (SourceEngineC — Catalog & Playback)
- **Catalog Endpoint:** `https://api.sheyda.com/query`
- **Headers:**
  ```http
  Content-Type: application/json
  Accept: application/json
  x-source-p: 202314
  User-Agent: Mozilla/5.0 (Linux; Android 14)
  ```

#### GraphQL Queries:
1. **Search:**
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
2. **Details & Playback:**
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

### Engine 4: JSONAPI & HLS Stream (SourceEngineD — Live Reverse-Engineered)
- **Base URL:** `https://www.filimo.com/api/fa/v1/`
- **Default Headers:**
  ```http
  Accept: application/json
  Referer: https://www.filimo.com/
  useragent: {"os":"react","pf":"site"}
  jsonType: simple
  User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36
  ```

#### Endpoints:
1. **Home Feed Rails:**
   - `GET /movie/movie/list/tagid/1`
   - Paginated Offset: `GET /movie/movie/list/tagid/1/list_perpage/20/list_offset/{offset}`
   - Movies Tag: `GET /movie/movie/list/tagid/1000`
   - Series Tag: `GET /movie/movie/list/tagid/1001`
   - Kids Hub: `GET /movie/movie/list/tagid/2001215`
2. **Visual Categories List:**
   - `GET /menu/menu/category`
   - Response contains array of genres with direct high-res backdrop art:
     ```json
     [
       {
         "id": 1000056,
         "link_text": "اکشن",
         "link_key": "action",
         "link_cover": "https://www.filimo.com/assets/web/ui/img-kmamKASrNEVPtLinT60Q/filimo/categories/fa/new_branding/1000056.jpg"
       },
       {
         "id": 1000060,
         "link_text": "کمدی",
         "link_key": "comedy",
         "link_cover": "https://www.filimo.com/assets/web/ui/img-kmamKASrNEVPtLinT60Q/filimo/categories/fa/new_branding/1000060.jpg"
       }
     ]
     ```
3. **Movie Details:**
   - `GET /movie/movie/one/uid/{uid}`
   - Returns `data.attributes.General` (`title`, `descr`, `imdb_rate`, `pro_year`), `data.attributes.cover_data` (vertical & horizontal posters), and `data.attributes.trailer.link_key` (Aparat HLS stream).
4. **Series Seasons & Episodes:**
   - Seasons List: `GET /movie/serial/allseason/uid/{uid}`
   - Episodes by Season:
     `GET /movie/serial/episodebyseason/parent_id/{parentId}/part/{seasonNumber}/sort/DESC/?episode_perpage=40`
     - Response: JSONAPI `included[]` containing episode items with `attributes.uid`, `attributes.movie_title`, `attributes.duration`, `attributes.pic.movie_img_m`, and `attributes.subtitle_list[]`.
5. **Direct Playback Stream (Master HLS .m3u8):**
   - `GET /movie/watch/watch/uid/{uid}`
   - Header: `Authorization: Bearer <AUTH_TOKEN>`
   - Response Structure:
     - `data.attributes.multiSRC[0][0].src`: Master HLS Playlist URL (`https://www.filimo.com/movie/watch/m3u8/mof/yes/v/1/.../master.m3u8`).
     - `data.attributes.tracks[]`: External VTT captions (`label`, `srclang`, `src` e.g. `/api/fa/v1/movie/subtitle/show/subid/121242`).
     - `data.attributes.intro`: `{ "start": 119, "end": 226 }` (Automatic Skip Intro button!).
     - `data.attributes.cast`: Next episode info and timestamp for automatic Next Episode popup.
     - `data.attributes.thumbs.webp_m_src`: VTT video scrubber preview sprites.
   - **Crucial Player Header:** When playing this `.m3u8` stream, the native video player MUST supply the header:
     `Referer: https://www.filimo.com/`

---

## 📺 Native Video Player (Cinema Experience)
Implement a robust, modern video player using `media_kit` / `better_player` (Flutter) or `react-native-video`:
1. **Multi-Source Fallback:** If Server 1 fails or encounters network timeout, seamlessly prompt or switch to Server 2 or Server 4.
2. **Quality Selector:** HLS Adaptive Bitrate (Auto, 1080p, 720p, 480p, 360p) + Direct MP4 selection.
3. **Audio & Subtitle Picker:** Switch between Persian Dubbing and Original Voice; select internal or external VTT/SRT subtitles with custom styling.
4. **Smart Controls:**
   - "رد کردن تیتراژ" (Skip Intro) button when current position enters the `intro` range.
   - "قسمت بعدی" (Next Episode) card when 90% of playback completes.
   - Vertical swipe on right half for Volume; vertical swipe on left half for Brightness.
   - Double-tap on sides for 10s seek forward/backward.
   - Background audio playback and Picture-in-Picture (PiP) support.
   - Save watch progress in local storage (Hive/SQLite) for "ادامه تماشا" (Resume Watching).

---

## 🚀 Execution & Deliverables
Generate the complete production project structure:
1. `lib/core/network/` - Clean HTTP clients with required headers.
2. `lib/features/home/` - Rich 10+ rail horizontal lists, hero banner slider.
3. `lib/features/categories/` - 2-column aesthetic card grid with gradient backdrops.
4. `lib/features/player/` - Advanced video player with gestures, audio/subtitle selection, and skip-intro.
5. `lib/features/search/` - Instant multi-source search with debounce.
```
