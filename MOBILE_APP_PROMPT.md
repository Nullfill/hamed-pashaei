# 🎬 پرامپت مستر ساخت کامل اپلیکیشن کلاینت «فیلمچی» (Filimchi Standalone Mobile App) از صفر
## ویژه Google AI Studio / Cursor / Claude

> **راهنمای استفاده:** کل متن انگلیسی زیر (داخل بلوک کُد Markdown) را کپی کرده و به عنوان پرامپت به **Google AI Studio** (با مدل Gemini 1.5 Pro یا 2.0 Flash) یا **Cursor** بدهید. این پرامپت شامل تمام یافته‌ها، اصلاحات ریشه‌ای، کدهای پارسر ۱۰۰٪ واقعی وب‌سرویس‌ها بدون هیچ داده هاردکد، معماری دکمه «مشاهده همه» با صفحه‌بندی نامحدود، کارت‌های زنده دسته‌بندی و پلیر سینمایی است تا هوش مصنوعی اپلیکیشن را از ابتدا بدون هیچ باگ یا داده ساختگی بسازد.

---

```markdown
# Master Project Blueprint: Standalone Production Mobile Client for "فیلمچی" (Filimchi)

You are a Principal Mobile Architect and Senior Flutter Engineer.
Your mission is to build the complete, production-ready, standalone mobile streaming application **"فیلمچی" (Filimchi)** for Android & iOS from scratch.

---

## 🛑 ABSOLUTE ZERO-MOCK & ZERO-HARDCODED MANDATE
1. **NO Mock Data:** DO NOT generate dummy movie arrays, fake titles, or placeholder mock lists.
2. **NO Hardcoded Section Names:** The Home Screen rails MUST NOT use hardcoded titles (e.g. do NOT hardcode lists like `["۱۰ فیلم برتر", "فیلم‌های جدید", ...]`). Every single rail title and movie card MUST be parsed dynamically from the real provider JSON responses.
3. **NO Fake Categories:** The Categories tab MUST fetch real categories and high-resolution backdrop art from the live API.
4. **"مشاهده همه" (See All) Dedicated Archive:** Tapping "مشاهده همه" on ANY rail MUST NEVER redirect to the Categories tab. It MUST open a dedicated, paginated `SectionArchiveScreen` that queries that specific section's API with infinite scroll.

---

## 🔒 Strict White-Label & Stealth Policy
1. **Brand Identity:** The application is 100% branded as **"فیلمچی" (Filimchi)**.
2. **Provider Anonymity:** 
   - NEVER expose or display the names "فیلیمو", "گپ فیلم", "شب فروش", "شیدا" or "Filimo", "Gapfilm", "Shabforoosh", "Sheyda" anywhere in the UI, cards, badges, dialogs, toasts, or error messages.
   - Clean provider strings from titles automatically (e.g. replace `"سریال های اختصاصی فیلیمو"` with `"سریال‌های اختصاصی فیلمچی"` or `"سریال‌های اختصاصی"`).
3. **Technical Server Labels for Streaming Sources:**
   - ⚡ **سرور ۱ (کیفیت اصلی - لینک مستقیم MP4)**
   - 🎙️ **سرور ۲ (دوبله اختصاصی فیلمچی - HLS خودکار)**
   - 💎 **سرور ۳ (کیفیت Ultra HD - مستر HLS با Skip Intro)**
   - 🚀 **سرور ۴ (دانلود پرسرعت مستقیم)**

---

## 🌐 Iranian API Gateway (Bypassing VPN & Geo-blocking)
Filimo and Gapfilm inspect client IP addresses. To prevent foreign IP geo-blocking when running behind a VPN, requests to Filimo and Gapfilm are routed through our high-speed Iranian API Gateway:
- **Gateway Base URL:** `https://www.dwn.qanadbook.com/filmchi/api-gateway.php?secret=filimchi-secret-2026&url=`
- Helper function in Dart:
  ```dart
  String buildGatewayUrl(String targetUrl) {
    return 'https://www.dwn.qanadbook.com/filmchi/api-gateway.php?secret=filimchi-secret-2026&url=${Uri.encodeComponent(targetUrl)}';
  }
  ```

---

## 🛠️ SECTION 1: Unified Data Models (`lib/core/models/catalog_models.dart`)

```dart
enum EngineSource { engineA, engineB, engineD } // Shabforoosh, Gapfilm, Filimo

class MediaItem {
  final String id;
  final String title;
  final String? titleEn;
  final String poster;
  final String backdrop;
  final String rating;
  final bool isSeries;
  final List<String> badges;
  final EngineSource engine;
  final String? plot;
  final String? year;

  MediaItem({
    required this.id,
    required this.title,
    this.titleEn,
    required this.poster,
    required this.backdrop,
    required this.rating,
    required this.isSeries,
    this.badges = const [],
    required this.engine,
    this.plot,
    this.year,
  });
}

class HomeSection {
  final String id;
  final String rawId;
  final String title;
  final bool isSlider;
  final EngineSource engine;
  final List<MediaItem> items;
  final String? paginationUrl;
  final Map<String, dynamic>? extraParams;

  HomeSection({
    required this.id,
    required this.rawId,
    required this.title,
    this.isSlider = false,
    required this.engine,
    required this.items,
    this.paginationUrl,
    this.extraParams,
  });
}

class CategoryItem {
  final String id;
  final String title;
  final String slug;
  final String coverUrl;

  CategoryItem({
    required this.id,
    required this.title,
    required this.slug,
    required this.coverUrl,
  });
}

class StreamSource {
  final String label;
  final String url;
  final String type; // 'hls' or 'mp4'
  final String quality;
  final bool isDubbed;
  final Map<String, String>? headers;

  StreamSource({
    required this.label,
    required this.url,
    required this.type,
    required this.quality,
    this.isDubbed = false,
    this.headers,
  });
}
```

---

## 🛠️ SECTION 2: The 3 Real Provider APIs & Verified Dart Parsers

### 1. Engine D (Filimo Real Rails & Categories)
- **Home Feed Endpoint:**
  `GET buildGatewayUrl('https://www.filimo.com/api/fa/v1/movie/movie/list/tagid/1')`
  - Headers: `useragent: {"os":"react","pf":"site"}`, `jsonType: simple`
- **JSON Structure & Parsing Rules:**
  - `included[]`: Map items by `'${item['type']}:${item['id']}' -> item['attributes']`.
    - Movies: `item['type'] == 'movies'`. Attributes: `uid`, `movie_title`, `movie_title_en`, `pic.movie_img_m`, `cover_desktop`, `imdb_rate`, `serial.enable`.
    - Sliders: `item['type'] == 'headersliders'`. Attributes: `link_key` (uid), `title`, `cover[0]` (high-res banner).
  - `data[]`: Array of section rows.
    - Ignore `filterform` and `customhtml`.
    - If `output_type == 'headerslider'` -> Hero Slider!
    - If `output_type == 'movie'` -> Horizontal rail.
      - Title: `row['attributes']['link_text']` (strip "فیلیمو" -> sanitize to clean Persian).
      - TagId: `row['attributes']['tag_id']?.toString() ?? row['attributes']['link_key']`.
      - Items: Resolve references from `row['relationships']['movies']['data']` mapped against `included`.

```dart
List<HomeSection> parseFilimoHomeSections(Map<String, dynamic> json) {
  final List<dynamic> included = json['included'] as List<dynamic>? ?? [];
  final Map<String, Map<String, dynamic>> includedMap = {};
  for (var item in included) {
    if (item is Map<String, dynamic>) {
      final type = item['type']?.toString() ?? '';
      final id = item['id']?.toString() ?? '';
      final attrs = item['attributes'] as Map<String, dynamic>? ?? {};
      includedMap['$type:$id'] = attrs;
    }
  }

  final List<dynamic> rows = json['data'] as List<dynamic>? ?? [];
  final List<HomeSection> sections = [];

  for (int index = 0; index < rows.length; index++) {
    final row = rows[index] as Map<String, dynamic>? ?? {};
    final attrs = row['attributes'] as Map<String, dynamic>? ?? {};
    final outputType = attrs['output_type']?.toString() ?? '';
    if (outputType == 'filterform' || outputType == 'customhtml') continue;

    final relationships = row['relationships'] as Map<String, dynamic>? ?? {};
    final bool isSlider = outputType == 'headerslider';

    List<MediaItem> items = [];
    if (isSlider) {
      final sliderData = (relationships['headersliders']?['data'] as List<dynamic>?) ?? [];
      for (var ref in sliderData) {
        final refId = ref['id']?.toString();
        final sliderAttrs = includedMap['headersliders:$refId'];
        if (sliderAttrs != null) {
          final targetUid = sliderAttrs['link_key']?.toString() ?? '';
          final title = sliderAttrs['title']?.toString() ?? '';
          final coverList = sliderAttrs['cover'] as List<dynamic>?;
          final backdrop = (coverList != null && coverList.isNotEmpty) ? coverList[0].toString() : '';
          if (targetUid.isNotEmpty) {
            items.add(MediaItem(
              id: targetUid,
              title: title.isEmpty ? 'منتخب ویژه' : title,
              poster: backdrop,
              backdrop: backdrop,
              rating: '',
              isSeries: false,
              engine: EngineSource.engineD,
            ));
          }
        }
      }
    } else {
      final moviesData = (relationships['movies']?['data'] as List<dynamic>?) ?? [];
      for (var ref in moviesData) {
        final refId = ref['id']?.toString();
        final movieAttrs = includedMap['movies:$refId'];
        if (movieAttrs != null) {
          final uid = movieAttrs['uid']?.toString() ?? movieAttrs['id']?.toString() ?? '';
          final title = movieAttrs['movie_title']?.toString() ?? movieAttrs['title_fa']?.toString() ?? '';
          final titleEn = movieAttrs['movie_title_en']?.toString();
          final pic = movieAttrs['pic'] as Map<String, dynamic>?;
          final poster = pic?['movie_img_m']?.toString() ?? pic?['movie_img_b']?.toString() ?? '';
          final backdrop = movieAttrs['cover_desktop']?.toString() ?? movieAttrs['cover_mobile']?.toString() ?? poster;
          final rating = movieAttrs['imdb_rate']?.toString() ?? movieAttrs['rate_avrage']?.toString() ?? '';
          final isSeries = movieAttrs['serial'] is Map ? (movieAttrs['serial']['enable'] == true) : false;

          if (uid.isNotEmpty && title.isNotEmpty) {
            items.add(MediaItem(
              id: uid,
              title: title,
              titleEn: titleEn,
              poster: poster,
              backdrop: backdrop,
              rating: rating,
              isSeries: isSeries,
              engine: EngineSource.engineD,
            ));
          }
        }
      }
    }

    if (items.isNotEmpty) {
      String rawTitle = attrs['link_text']?.toString() ?? (isSlider ? 'منتخب‌ها' : 'فیلم و سریال');
      String cleanTitle = rawTitle.replaceAll('فیلیمو', 'فیلمچی').trim();
      final rawId = attrs['tag_id']?.toString() ?? attrs['link_key']?.toString() ?? attrs['list_tag_id']?.toString() ?? index.toString();

      sections.add(HomeSection(
        id: 'filimo-$rawId',
        rawId: rawId,
        title: cleanTitle,
        isSlider: isSlider,
        engine: EngineSource.engineD,
        items: items,
      ));
    }
  }

  return sections;
}
```

---

### 2. Engine B (Gapfilm Real Rails)
- **Home Feed Endpoint:**
  `GET buildGatewayUrl('https://core.gapfilm.ir/api/v3.3/GetFirstPageByPlatform?PlatformId=1&PlatformType=1&PageType=1&PageSize=20&PageIndex=0&ContentRows=12&ParentType=2&ClientTags=Web')`
  - Headers: `PlatformType: Web`, `Referer: https://www.gapfilm.ir/`
- **JSON Structure & Parsing Rules:**
  - `Result['Sections']`: Returns 15–20 real sections!
  - `section['SectionId']`: Section ID (e.g. `33066`, `36`, `71`, `153311`, `45277`, `101`).
  - `section['Title']`: Real title (e.g. `"برترین ها"`, `"دوبله"`, `"تازه ها"`, `"پیشنهاد‌های ویژه"`, `"انیمیشن"`).
  - `section['SectionTemplateId']`: `2` = Hero Slider, others = Movie Rail.
  - **`section['ContentSummaryRows']`**: **CRITICAL! Movie items are located here (NOT `Contents`)**.
    - Skip sections with fewer than 2 items.
    - Movie attributes: `ContentId`, `Title`, `EnglishTitle`, `ZoneId` (`3` = series, `4` = movie).
    - Posters: `'https://cdn.gapfilm.ir/image/362/panel/${ContentId}/portrait.jpg'`
    - Backdrops: `'https://cdn.gapfilm.ir/image/1280/panel/${ContentId}/landscape.jpg'`
    - Rating: Value of property with `PropertyId == 16`.

```dart
List<HomeSection> parseGapfilmHomeSections(Map<String, dynamic> json) {
  final result = json['Result'] as Map<String, dynamic>? ?? {};
  final rawSections = result['Sections'] as List<dynamic>? ?? [];
  final List<HomeSection> sections = [];

  for (int index = 0; index < rawSections.length; index++) {
    final s = rawSections[index] as Map<String, dynamic>? ?? {};
    final summaryRows = s['ContentSummaryRows'] as List<dynamic>? ?? [];
    if (summaryRows.length < 2) continue;

    final sectionId = s['SectionId']?.toString() ?? index.toString();
    String rawTitle = s['Title']?.toString() ?? 'فیلم و سریال';
    String cleanTitle = rawTitle.replaceAll(RegExp(r'گپ[\s‌-]*فیلم'), 'فیلمچی').replaceAll('- تک بنر', '').trim();

    final bool isSlider = s['SectionTemplateId'] == 2 || sectionId == '1';

    final List<MediaItem> items = [];
    for (var item in summaryRows) {
      if (item is Map<String, dynamic>) {
        final contentId = item['ContentId']?.toString() ?? item['ContentID']?.toString() ?? '';
        final title = item['Title']?.toString() ?? '';
        final titleEn = item['EnglishTitle']?.toString();
        final zoneId = item['ZoneId'] ?? item['ZoneID'];
        final isSeries = zoneId == 3;

        String rating = '';
        final properties = item['Properties'] as List<dynamic>? ?? [];
        for (var p in properties) {
          if (p is Map<String, dynamic> && (p['PropertyId'] == 16 || p['Id'] == 16)) {
            rating = p['Value']?.toString() ?? '';
            break;
          }
        }

        if (contentId.isNotEmpty && title.isNotEmpty) {
          items.add(MediaItem(
            id: contentId,
            title: title,
            titleEn: titleEn,
            poster: 'https://cdn.gapfilm.ir/image/362/panel/$contentId/portrait.jpg',
            backdrop: 'https://cdn.gapfilm.ir/image/1280/panel/$contentId/landscape.jpg',
            rating: rating,
            isSeries: isSeries,
            engine: EngineSource.engineB,
          ));
        }
      }
    }

    if (items.isNotEmpty) {
      sections.add(HomeSection(
        id: 'gapfilm-$sectionId',
        rawId: sectionId,
        title: cleanTitle,
        isSlider: isSlider,
        engine: EngineSource.engineB,
        items: items,
      ));
    }
  }

  return sections;
}
```

---

### 3. Engine A (Shabforoosh Real Rails)
- **Home Feed Endpoint:**
  `GET https://shabforoosh.ir/wp-json/mapi/v1/post/all`
- **JSON Structure & Parsing Rules:**
  - `data['sections']`: Array of 14 real sections directly from API!
  - `section['title']`: Real title (e.g. `"جدیدترین فیلم ها"`, `"250 فیلم برتر"`, `"فیلم های ایرانی"`, `"فیلم های اکشن"`, `"جدیدترین سریال ها"`, `"پیشنهادی ها"`).
  - `section['view_all']['url']`: Pagination URL for "مشاهده همه" (e.g. `"https://shabforoosh.ir/wp-json/mapi/v1/post/movies"`).
  - `section['view_all']['paramters']`: Extra query parameters (e.g. `{"genres": 29}`, `{"imdbtop250": 1}`).
  - `section['items']`: 18 real movie objects (`id`, `fa_title`, `title`, `thumbnail`, `background`, `rate`, `type`).

```dart
List<HomeSection> parseShabforooshHomeSections(Map<String, dynamic> json) {
  final data = json['data'] as Map<String, dynamic>? ?? {};
  final rawSections = data['sections'] as List<dynamic>? ?? [];
  final List<HomeSection> sections = [];

  for (int index = 0; index < rawSections.length; index++) {
    final s = rawSections[index] as Map<String, dynamic>? ?? {};
    final rawItems = s['items'] as List<dynamic>? ?? [];
    if (rawItems.isEmpty) continue;

    final title = s['title']?.toString() ?? 'فیلم و سریال';
    final key = s['key']?.toString() ?? index.toString();
    final viewAll = s['view_all'] as Map<String, dynamic>? ?? {};
    final paginationUrl = viewAll['url']?.toString();
    final extraParams = viewAll['paramters'] as Map<String, dynamic>?;

    final List<MediaItem> items = [];
    for (var item in rawItems) {
      if (item is Map<String, dynamic>) {
        final id = item['id']?.toString() ?? '';
        final titleFa = item['fa_title']?.toString() ?? item['title']?.toString() ?? '';
        final titleEn = item['title']?.toString();
        final poster = item['thumbnail']?.toString() ?? '';
        final backdrop = item['background']?.toString() ?? poster;
        final rating = item['rate']?.toString() ?? '';
        final isSeries = item['type']?.toString().toLowerCase() == 'series';

        if (id.isNotEmpty && titleFa.isNotEmpty) {
          items.add(MediaItem(
            id: id,
            title: titleFa,
            titleEn: titleEn,
            poster: poster,
            backdrop: backdrop,
            rating: rating,
            isSeries: isSeries,
            engine: EngineSource.engineA,
          ));
        }
      }
    }

    if (items.isNotEmpty) {
      sections.add(HomeSection(
        id: 'shab-$key',
        rawId: key,
        title: title,
        isSlider: false,
        engine: EngineSource.engineA,
        items: items,
        paginationUrl: paginationUrl,
        extraParams: extraParams,
      ));
    }
  }

  return sections;
}
```

---

## 🛠️ SECTION 3: Unified Service & Dynamic Home Screen

```dart
class UnifiedCatalogService {
  static final UnifiedCatalogService instance = UnifiedCatalogService._();
  UnifiedCatalogService._();

  Future<List<HomeSection>> fetchHomeSections() async {
    final filimoFuture = http.get(Uri.parse(
      'https://www.dwn.qanadbook.com/filmchi/api-gateway.php?secret=filimchi-secret-2026&url=https%3A%2F%2Fwww.filimo.com%2Fapi%2Ffa%2Fv1%2Fmovie%2Fmovie%2Flist%2Ftagid%2F1'
    )).then((r) => parseFilimoHomeSections(jsonDecode(utf8.decode(r.bodyBytes)))).catchError((_) => <HomeSection>[]);

    final gapfilmFuture = http.get(Uri.parse(
      'https://www.dwn.qanadbook.com/filmchi/api-gateway.php?secret=filimchi-secret-2026&url=' +
      Uri.encodeComponent('https://core.gapfilm.ir/api/v3.3/GetFirstPageByPlatform?PlatformId=1&PlatformType=1&PageType=1&PageSize=20&PageIndex=0&ContentRows=12&ParentType=2&ClientTags=Web')
    )).then((r) => parseGapfilmHomeSections(jsonDecode(utf8.decode(r.bodyBytes)))).catchError((_) => <HomeSection>[]);

    final shabFuture = http.get(Uri.parse(
      'https://shabforoosh.ir/wp-json/mapi/v1/post/all'
    )).then((r) => parseShabforooshHomeSections(jsonDecode(utf8.decode(r.bodyBytes)))).catchError((_) => <HomeSection>[]);

    final results = await Future.wait([filimoFuture, gapfilmFuture, shabFuture]);
    final filimoSections = results[0];
    final gapfilmSections = results[1];
    final shabSections = results[2];

    final List<HomeSection> interleaved = [];

    // 1. Pick Hero Slider
    HomeSection? heroSlider = filimoSections.firstWhere((s) => s.isSlider, orElse: () => 
      gapfilmSections.firstWhere((s) => s.isSlider, orElse: () => filimoSections.isNotEmpty ? filimoSections.first : gapfilmSections.first)
    );
    interleaved.add(heroSlider);

    // 2. Interleave standard rails (15–20 distinct rails)
    final filimoRails = filimoSections.where((s) => !s.isSlider).toList();
    final gapfilmRails = gapfilmSections.where((s) => !s.isSlider).toList();
    final shabRails = shabSections.where((s) => !s.isSlider).toList();

    int maxCount = [filimoRails.length, gapfilmRails.length, shabRails.length].reduce((a, b) => a > b ? a : b);
    for (int i = 0; i < maxCount; i++) {
      if (i < filimoRails.length) interleaved.add(filimoRails[i]);
      if (i < gapfilmRails.length) interleaved.add(gapfilmRails[i]);
      if (i < shabRails.length) interleaved.add(shabRails[i]);
    }

    return interleaved;
  }
}
```

### Home Screen Rendering:
- Renders `interleaved[0]` as the auto-scrolling **Hero Showcase Carousel** with gradient backdrop, play button, and info pill.
- Renders all remaining sections as sleek horizontal rails with Persian title header and "مشاهده همه" (See All) button.
- Movie cards: 2:3 vertical aspect ratio, rounded corners (`12px`), title in `Vazirmatn Medium 14px`, and IMDb rating badge.

---

## 🛠️ SECTION 4: "مشاهده همه" (See All) Dedicated Archive (`SectionArchiveScreen`)

When user taps "مشاهده همه" on ANY rail header:
```dart
onTapSeeAll: () {
  Navigator.push(
    context,
    MaterialPageRoute(
      builder: (context) => SectionArchiveScreen(
        sectionTitle: section.title,
        rawId: section.rawId,
        engine: section.engine,
        paginationUrl: section.paginationUrl,
        extraParams: section.extraParams,
        initialItems: section.items,
      ),
    ),
  );
}
```

### Infinite Scroll Implementation in `SectionArchiveScreen`:
Displays a 3-column responsive poster grid (`GridView.builder`).
When `ScrollController.position.pixels >= maxScrollExtent - 300`:
- **For Engine D (Filimo):**
  - URL: `buildGatewayUrl('https://www.filimo.com/api/fa/v1/movie/movie/list/tagid/${widget.rawId}/list_perpage/20/list_offset/$offset')`
  - Increment `offset += 20` (0, 20, 40, 60...).
  - Extract items from `included` where `item['type'] == 'movies'`.
- **For Engine B (Gapfilm):**
  - URL: `buildGatewayUrl('https://core.gapfilm.ir/api/v3.3/GetFirstPageByPlatformPaging?EntityId=${widget.rawId}&EntityType=1&PlatformType=1&AgeRangeId=5&PageSize=20&PageIndex=$pageIndex')`
  - Increment `pageIndex += 1` (0, 1, 2, 3...).
  - Extract items from `Result['Contents']`.
- **For Engine A (Shabforoosh):**
  - URL: Base `widget.paginationUrl ?? 'https://shabforoosh.ir/wp-json/mapi/v1/post/movies'`.
  - Add query params: `page=$page&per_page=20` + spread `widget.extraParams ?? {}`.
  - Increment `page += 1` (1, 2, 3...).
  - Extract items from `data` array.

---

## 🛠️ SECTION 5: 100% Dynamic Categories Screen (`CategoriesScreen`)

### Real Categories API:
- **Endpoint:**
  `GET buildGatewayUrl('https://www.filimo.com/api/fa/v1/menu/menu/category')`
- **Data Extraction:**
  Items are inside `data[]`, and attributes are inside `item['attributes']`:
  - `id`: `item['id']`
  - `title`: `item['attributes']['link_text']` (clean "فیلیمو" -> "فیلمچی")
  - `slug`: `item['attributes']['link_key']`
  - `coverUrl`: `item['attributes']['link_cover']` (**REAL High-Resolution Backdrop Image URL!**)

```dart
Future<List<CategoryItem>> fetchCategories() async {
  final url = buildGatewayUrl('https://www.filimo.com/api/fa/v1/menu/menu/category');
  final response = await http.get(Uri.parse(url));
  final json = jsonDecode(utf8.decode(response.bodyBytes)) as Map<String, dynamic>;
  final data = json['data'] as List<dynamic>? ?? [];

  return data.map((item) {
    final id = item['id']?.toString() ?? '';
    final attrs = item['attributes'] as Map<String, dynamic>? ?? {};
    String rawTitle = attrs['link_text']?.toString() ?? '';
    String cleanTitle = rawTitle.replaceAll('فیلیمو', 'فیلمچی').trim();
    final slug = attrs['link_key']?.toString() ?? '';
    final cover = attrs['link_cover']?.toString() ?? '';

    return CategoryItem(
      id: id,
      title: cleanTitle,
      slug: slug,
      coverUrl: cover,
    );
  }).where((c) => c.id.isNotEmpty && c.title.isNotEmpty && c.coverUrl.isNotEmpty).toList();
}
```

### Visual Card Grid & Navigation:
- **Layout:** 2-column grid (`SliverGrid` / `GridView.builder`) with `14px` padding and `12px` cross-axis spacing.
- **Card Styling:** Aspect ratio 16:10 with `border-radius: 16px`, `CachedNetworkImage` backdrop, dark translucent linear gradient overlay, genre accent glow, Persian title in bold `Vazirmatn Black 18px`, and uppercase English subtitle.
- **Tap Behavior:** Opens `CategoryDetailScreen(categoryId: item.id, categoryTitle: item.title)` which performs infinite-scroll pagination querying:
  `buildGatewayUrl('https://www.filimo.com/api/fa/v1/movie/movie/list/tagid/${item.id}/list_perpage/20/list_offset/$offset')`

---

## 🛠️ SECTION 6: Detail Screen & Streaming Playback Engine

### Movie/Series Details:
- When a user taps a movie card, navigate to `MediaDetailScreen(item: item)`.
- Displays full-bleed backdrop art, title, release year, IMDb badge, Persian synopsis, and cast.
- If series: fetches seasons and episodes list.

### Multi-Server Playback Extraction:
- **سرور ۱ (شبکه پرسرعت - لینک مستقیم MP4):**
  - For Engine A items: `GET https://shabforoosh.ir/wp-json/mapi/v1/post/{id}` -> `data.download_links[]` (1080p, 720p, 480p direct `.mp4`).
- **سرور ۲ (دوبله اختصاصی فیلمچی - HLS خودکار):**
  - For Engine B items: `GET https://core.gapfilm.ir/api/v4/Content/GetContentAttachments?Id={id}&generateLink=true` -> `Result.Attachments[]` (HLS master `.m3u8` with dubbed audio).
- **سرور ۳ (کیفیت Ultra HD - مستر HLS با Skip Intro):**
  - For Engine D items: `GET buildGatewayUrl('https://www.filimo.com/api/fa/v1/movie/watch/watch/uid/{uid}')`
  - Playback master playlist: `data.attributes.multiSRC[0][0].src`
  - Intro timestamps: `data.attributes.intro.start` and `data.attributes.intro.end` for the "رد کردن تیتراژ" button.
  - Subtitle tracks: `data.attributes.tracks[]`
  - **MANDATORY HEADER FOR FILIMO STREAMS:** The video player MUST pass `Referer: https://www.filimo.com/`.

---

## 🛠️ SECTION 7: Complete Code Deliverables to Generate

Generate the entire, working Flutter application code across these files:
1. `lib/core/models/catalog_models.dart` - Models for MediaItem, HomeSection, CategoryItem, StreamSource.
2. `lib/core/services/unified_catalog_service.dart` - Complete service with the 3 real parsers, gateway helpers, and dynamic interleaving.
3. `lib/features/home/presentation/home_screen.dart` - Production Home Screen with Hero Slider and dynamic rails.
4. `lib/features/home/presentation/section_archive_screen.dart` - Complete infinite-scroll 3-column poster grid for "مشاهده همه".
5. `lib/features/categories/presentation/categories_screen.dart` - 2-column visual card grid fetching live categories with real covers.
6. `lib/features/categories/presentation/category_detail_screen.dart` - Category archive grid with infinite scroll.
7. `lib/features/detail/presentation/media_detail_screen.dart` - Full movie/series detail screen with episode list and server picker.
8. `lib/features/player/presentation/cinema_player_screen.dart` - Fullscreen video player with quality selector, subtitle picker, skip-intro button, and gesture controls.
9. `lib/main.dart` - Application entry point with RTL Persian Theme, Vazirmatn font, and bottom navigation bar.

Generate this complete, production-grade codebase now.
```
