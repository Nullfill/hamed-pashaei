# 🔧 پرامپت اختصاصی «اعمال اصلاحات و ارتقای کُد موجود» (Refactoring & Upgrade Prompt)
## ویژه Google AI Studio / Cursor / Claude

> **راهنمای استفاده:** کل متن انگلیسی زیر (داخل بلوک کد) را کپی کرده و در چت فعلی **Google AI Studio** که کدهای اپلیکیشن شما در آن قرار دارد ارسال کنید. این پرامپت به هوش مصنوعی دستور می‌دهد کدهای موجود را تخریب نکند، بلکه دقیقاً ۴ بخش مورد نظر شما (حذف نام پروایدرها، چندسکشنه شدن صفحه اول، کارت‌های دسته‌بندی و اتصال لایو فیلیمو) را اصلاح و جایگزین کند.

---

```markdown
# Context & Refactoring Objective
You are a Principal Mobile Architect and Senior Flutter/React Native Engineer.
We already have the baseline code of our video streaming application **"فیلمچی" (Filimchi)**.
Do NOT start from scratch. Instead, perform a surgical refactor and upgrade on the existing codebase to implement the following 4 mandatory revisions immediately:

---

## 🚫 REVISION 1: Total White-Label Scrubbing (Zero Provider Names in UI)
The client requires 100% white-label confidentiality.
1. **Scrub All Provider Names from the UI:**
   - Search the entire UI codebase and REMOVE all occurrences of:
     - `فیلیمو`, `گپ فیلم`, `شب فروش`, `شیدا`
     - `Filimo`, `Gapfilm`, `Shabforoosh`, `Sheyda`
   - NEVER show provider names on movie cards, badges, search filters, toasts, dialogs, or error messages.
2. **Rebrand Streaming Sources on Detail Screens & Player:**
   - On the Movie/Series Detail screen and Player Server Selector, rename source options to technical, user-friendly labels:
     - ⚡ **سرور ۱ (کیفیت اصلی / خودکار HLS)**
     - 🎙️ **سرور ۲ (دوبله اختصاصی فیلمچی)**
     - 💎 **سرور ۳ (کیفیت Ultra HD)**
     - 🚀 **سرور ۴ (دانلود پرسرعت مستقیم MP4)**
3. **Internal Code Naming:**
   - Refactor provider classes/enums to neutral names (e.g. `SourceEngineA`, `SourceEngineB`, `SourceEngineC`, `SourceEngineD` or `EngineType.source1`, `EngineType.source2`).
   - The unified search and catalog must interweave items seamlessly without disclosing their origins to the end user.

---

## 🏠 REVISION 2: Rich Multi-Section Home Feed (Expand from 2-3 to 10+ Rails)
The current Home Screen only renders 2-3 basic sections. The user requires an expansive, rich, cinema-grade feed with at least **10 distinct horizontal rails** below the Hero Slider:

1. **Hero Showcase Carousel (اسلایدر بنر ویژه):**
   - Full-bleed poster backdrop with bottom dark gradient fade (`#07070a`).
   - Persian title typography, IMDb rating pill, release year, age limit, and 2-line Persian plot synopsis.
   - Golden badges: `ویژه فیلمچی`, `دوبله اختصاصی`, `کیفیت 4K`.
   - Action buttons: "تماشا کنید" (Play) with Gold background + "افزودن به لیست من" (+ My List).
   - Auto-scroller with smooth dot indicators.
2. **🔥 ۱۰ فیلم و سریال برتر هفته (Top 10 Trending This Week):**
   - Large vertical cards accompanied by oversized, stylized 3D ranking numerals (1 through 10) in gold/white overlay.
3. **🎬 تازه ترین فیلم‌های سینمایی (Latest Movie Releases):**
   - 2:3 vertical poster cards with Persian title, year, and dubbed/subtitled badges.
4. **📺 سریال‌های روز و در حال پخش (On-Air Trending Series):**
   - Poster cards with active badge: "قسمت جدید اضافه شد" and current season indicator.
5. **🎙️ دوبله اختصاصی فیلمچی (Filimchi Exclusive Dubbed):**
   - Premium Persian voice-acted titles with a glowing golden microphone badge.
6. **⭐ شاهکارهای سینما (IMDb Top 250 & Awards):**
   - Top-rated classics (IMDb 8.0+) with golden IMDb star pills.
7. **⚡ اکشن و آدرنالین (Adrenaline & High-Octane Action):**
   - Explosive blockbuster hits and martial arts films.
8. **🎭 کمدی و خنده خانواده (Persian & World Comedy):**
   - Iranian comedies, stand-up shows, and global comedy sensations.
9. **🚀 جهان علمی-تخیلی و فانتزی (Sci-Fi & Cyberpunk):**
   - Futuristic, multiverse, superhero, and space adventure titles.
10. **👶 سرزمین کارتون و انیمه (Animation & Anime Universe):**
    - Vibrant, colorful cards for kids and anime fans with dubbed badges.
11. **🇰🇷 کی‌دراما و سینمای شرق (Korean Drama Craze):**
    - Trending Korean, Japanese, and Chinese drama series.
12. **🌍 مستندهای شگفت‌انگیز (World & Nature Documentaries):**
    - 16:9 widescreen landscape cards with photography-first design.

*Data Wiring:* If an engine lacks items for a specific rail, the `UnifiedCatalogService` must intelligently map from the other available engines or filter by genre/tag (`action`, `comedy`, `animation`, `sci-fi`, etc.) to guarantee all 10+ rails are fully populated!

---

## 📂 REVISION 3: Redesign Categories Bottom Nav Tab (Visual Cards Grid)
The user explicitly rejected plain chips or text lists for the Categories screen.
Replace the entire Categories tab with a **2-Column Responsive Grid of High-Impact Visual Cards**:

### Card Specifications:
- **Layout:** 2-column grid (`SliverGrid` / `FlatList numColumns={2}`) with `16px` padding and `14px` cross-axis spacing.
- **Card Aspect Ratio:** 16:10 or 4:3 with `border-radius: 16px` and clipping.
- **Backdrop Image:** Each card MUST display a high-resolution cinematic backdrop image representing that genre (use direct cover URLs from `/api/fa/v1/menu/menu/category` or bundled genre covers).
- **Genre-Specific Color Glow & Gradient:**
  A smooth dark diagonal gradient (`linear-gradient(180deg, rgba(7,7,10,0.2) 0%, rgba(7,7,10,0.85) 75%, #07070a 100%)`) with genre accent tinting:
  - **اکشن (Action):** Fiery Amber (`#FF6B00`)
  - **کمدی (Comedy):** Emerald Green (`#10B981`)
  - **انیمیشن (Animation):** Electric Violet (`#8B5CF6`)
  - **وحشت و ترسناک (Horror):** Crimson Blood (`#DC2626`)
  - **علمی-تخیلی (Sci-Fi):** Neon Cyan (`#06B6D4`)
  - **درام (Drama):** Royal Indigo (`#6366F1`)
  - **عاشقانه (Romance):** Velvet Rose (`#F43F5E`)
  - **جنایی و معمایی (Crime):** Midnight Cobalt (`#475569`)
  - **مستند (Documentary):** Forest Olive (`#059669`)
  - **تاریخی (History):** Warm Ochre (`#B45309`)
  - **کودک و نوجوان (Kids):** Vibrant Sunburst (`#FBBF24`)
  - **سریال کره‌ای (K-Drama):** Blossom Magenta (`#EC4899`)
- **Typography & Content inside Card:**
  - Persian Genre Name in `Vazirmatn Black 18px` (e.g. **اکشن**, **کمدی**, **انیمیشن**).
  - English Genre Subtitle in small caps uppercase (`ACTION`, `COMEDY`, `ANIMATION`).
  - Item Counter Badge in bottom corner: glassmorphic pill e.g. `+۱,۲۰۰ عنوان`.
- **Tap Behavior:**
  - Tapping a card animates with a scale bounce (`0.97 -> 1.0`) and navigates to the `GenreArchiveScreen` with an infinite-scrolling poster grid and filter chips (`همه`, `فیلم`, `سریال`, `دوبله فارسی`).

---

## ⚡ REVISION 4: Direct Filimo Engine Implementation (Live Verified Endpoints)
Update the internal Engine 4 (`SourceEngineD`) to use the exact reverse-engineered endpoints extracted from the live platform:

- **Base URL:** `https://www.filimo.com/api/fa/v1/`
- **Required Headers:**
  ```http
  Accept: application/json
  Referer: https://www.filimo.com/
  useragent: {"os":"react","pf":"site"}
  jsonType: simple
  User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36
  ```

### Live Endpoints to Wire:
1. **Home Feed Rails:**
   - `GET /movie/movie/list/tagid/1`
   - Pagination: `GET /movie/movie/list/tagid/1/list_perpage/20/list_offset/{offset}`
2. **Visual Categories:**
   - `GET /menu/menu/category`
   - Returns list of genres with direct `link_cover` URLs (e.g. `https://www.filimo.com/assets/web/ui/img-kmamKASrNEVPtLinT60Q/filimo/categories/fa/new_branding/1000056.jpg` for Action).
3. **Movie Details:**
   - `GET /movie/movie/one/uid/{uid}`
   - Attributes: `General.title`, `descr`, `imdb_rate`, `pro_year`, `cover_data.vertical`, `cover_data.horizontal`, `trailer.link_key`.
4. **Series Seasons & Episodes:**
   - Seasons: `GET /movie/serial/allseason/uid/{uid}`
   - Episodes by Season:
     `GET /movie/serial/episodebyseason/parent_id/{parentId}/part/{seasonNumber}/sort/DESC/?episode_perpage=40`
     - Response: JSONAPI `included[]` containing episode items with `attributes.uid`, `attributes.movie_title`, `attributes.duration`, `attributes.pic.movie_img_m`, and `attributes.subtitle_list[]`.
5. **Playback Stream (Master HLS .m3u8):**
   - `GET /movie/watch/watch/uid/{uid}`
   - Header: `Authorization: Bearer <AUTH_TOKEN>`
   - Payload data:
     - `attributes.multiSRC[0][0].src`: Direct Master HLS playlist URL (`.m3u8`).
     - `attributes.intro`: `{ start: number, end: number }` -> Triggers "رد کردن تیتراژ" (Skip Intro) button in the player!
     - `attributes.cast`: Next episode metadata -> Prompts "قسمت بعد" card near video end.
     - `attributes.tracks[]`: External WebVTT subtitles (`src`, `srclang`, `label`).
   - **Crucial Stream Header:** When the native player plays the `.m3u8` URL or its `.ts` segments, it MUST send `Referer: https://www.filimo.com/`.

---

## 🌐 REVISION 5: Live Iranian API Gateway (Bypass VPN Geo-Restrictions)
We have successfully deployed an active, verified PHP API Gateway on an Iranian DirectAdmin server.
When the user's mobile device is connected via VPN or a non-Iran IP, route API requests through this gateway to ensure providers return the domestic Iranian catalog (`country: "IR"`, `abroad: false`, `IsDomesticTraffic: true`):

- **Active Gateway URL:** `https://www.dwn.qanadbook.com/filmchi/api-gateway.php`
- **Secret Key:** `filimchi-secret-2026`
- **Usage Example (Dio / Axios):**
  ```dart
  // To request any provider endpoint through the Iran Gateway:
  final targetUrl = "https://www.filimo.com/api/fa/v1/movie/movie/list/tagid/1";
  final gatewayUrl = "https://www.dwn.qanadbook.com/filmchi/api-gateway.php?secret=filimchi-secret-2026&url=${Uri.encodeComponent(targetUrl)}";
  
  // Headers to forward:
  final headers = {
    'useragent': '{"os":"react","pf":"site"}',
    'jsonType': 'simple',
  };
  ```
- *Note:* Video playback (.mp4 / .m3u8 .ts chunks) must still stream directly to the player without passing through the gateway to preserve host bandwidth.

---

## 🛠️ Step-by-Step Code Output Plan
Please provide the updated and refactored code files:
1. **`lib/features/home/presentation/home_screen.dart`** (or React Native equivalent) - All 10+ dynamic rails + Hero slider.
2. **`lib/features/categories/presentation/categories_screen.dart`** - 2-column visual card grid with genre artwork and gradients.
3. **`lib/features/player/presentation/video_player_screen.dart`** - Player with white-labeled server names (`سرور ۱`, `سرور ۲`), HLS/MP4 quality switch, and Skip Intro.
4. **`lib/core/services/unified_catalog_service.dart`** - Aggregation logic that wipes provider names and feeds all 10+ Home rails.
5. **`lib/features/sources/engine_d_client.dart`** - Verified Filimo endpoints (category covers, episode lists, m3u8 stream).

Proceed with refactoring now.
```
