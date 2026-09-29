# 🚨 پرامپت اصلاح فوری و جامع: حذف کامل کدهای هاردکد، سکشن‌های واقعی صفحه اول و رفع باگ «مشاهده همه»
## ویژه Google AI Studio / Cursor / Claude

> **راهنمای استفاده:** کل متن انگلیسی زیر (داخل بلوک کد) را کپی کرده و به هوش مصنوعی در همان چت پروژه ارسال کنید. این پرامپت شامل تمام کدهای پارسر واقعی و متدهای دقیق خواندن از JSON برای پروایدرهای شب‌فروش، گپ‌فیلم و فیلیمو است تا هوش مصنوعی به هیچ عنوان سکشن‌های فیک یا هاردکدشده تولید نکند و تمام سکشن‌های صفحه اول، دکمه «مشاهده همه» و دسته‌بندی‌ها ۱۰۰٪ داینامیک و زنده از وب‌سرویس‌ها خوانده شوند.

---

```markdown
# Critical Architecture Refactor: 100% Dynamic Provider Sections, Zero Hardcoded Rails & Real Archive Pagination

You are a Principal Mobile Architect and Senior Flutter Engineer.
Our video streaming app **"فیلمچی" (Filimchi)** currently suffers from critical architectural bugs:

1. **Fake & Hardcoded Home Rails:** Some sections on the Home Screen were written with mock lists or hardcoded section titles (e.g., hardcoded arrays of titles) instead of parsing the 100% REAL rails returned dynamically by the provider APIs.
2. **"مشاهده همه" (See All) Broken Navigation:** Tapping "مشاهده همه" on any rail lazily pushes the generic Categories tab (`/categories`), rather than opening a dedicated, paginated `SectionArchiveScreen` for that specific rail.
3. **Hardcoded / Empty Categories:** The Categories tab uses mock genre chips or fails to extract the real backdrop covers because it reads properties at the root instead of inside `attributes`.
4. **Provider Leakage:** Provider names must remain 100% invisible to the end user (strictly white-labeled as "فیلمچی").

**CRITICAL MANDATE:** 
DO NOT GENERATE ANY MOCK DATA, FAKE MOVIE ARRAYS, OR HARDCODED SECTION TITLES.
EVERY RAIL, MOVIE POSTER, RATING, AND CATEGORY MUST ORIGINATE DIRECTLY FROM THE REAL API JSON RESPONSES DETAILED BELOW.

---

## 🌐 The Iranian API Gateway Endpoint
All requests to Filimo and Gapfilm must go through our Iranian gateway to prevent foreign IP geo-blocking:
- **Gateway Base URL:** `https://www.dwn.qanadbook.com/filmchi/api-gateway.php?secret=filimchi-secret-2026&url=`
- To call any URL, append the URI-encoded target URL to the gateway base.
- Example:
  ```dart
  String buildGatewayUrl(String targetUrl) {
    return 'https://www.dwn.qanadbook.com/filmchi/api-gateway.php?secret=filimchi-secret-2026&url=${Uri.encodeComponent(targetUrl)}';
  }
  ```

---

## 🛑 SECTION 1: Exact Real JSON Schemas & Dart Parsers for the 3 Providers

### 1. Data Models (`lib/core/models/catalog_models.dart`)
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
```

---

### 2. Engine D (Filimo Real Rails)
- **Endpoint:**
  `GET buildGatewayUrl('https://www.filimo.com/api/fa/v1/movie/movie/list/tagid/1')`
- **Exact Dart Parsing Function:**
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
              title: title.isEmpty ? 'فیلم منتخب' : title,
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
      String cleanTitle = rawTitle.replaceAll('فیلیمو', '').trim();
      if (cleanTitle.isEmpty) cleanTitle = isSlider ? 'منتخب‌ها' : 'فیلم و سریال';
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

### 3. Engine B (Gapfilm Real Rails)
- **Endpoint:**
  `GET buildGatewayUrl('https://core.gapfilm.ir/api/v3.3/GetFirstPageByPlatform?PlatformId=1&PlatformType=1&PageType=1&PageSize=20&PageIndex=0&ContentRows=12&ParentType=2&ClientTags=Web')`
- **Exact Dart Parsing Function:**
```dart
List<HomeSection> parseGapfilmHomeSections(Map<String, dynamic> json) {
  final result = json['Result'] as Map<String, dynamic>? ?? {};
  final rawSections = result['Sections'] as List<dynamic>? ?? [];
  final List<HomeSection> sections = [];

  for (int index = 0; index < rawSections.length; index++) {
    final s = rawSections[index] as Map<String, dynamic>? ?? {};
    // CRITICAL: Items are inside ContentSummaryRows, NOT Contents!
    final summaryRows = s['ContentSummaryRows'] as List<dynamic>? ?? [];
    if (summaryRows.length < 2) continue; // skip single promo banners or empty rails

    final sectionId = s['SectionId']?.toString() ?? index.toString();
    String rawTitle = s['Title']?.toString() ?? 'فیلم و سریال';
    String cleanTitle = rawTitle.replaceAll(RegExp(r'گپ[\s‌-]*فیلم'), '').replaceAll('- تک بنر', '').trim();
    if (cleanTitle.isEmpty) cleanTitle = 'پیشنهادهای ویژه';

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

### 4. Engine A (Shabforoosh Real Rails)
- **Endpoint:**
  `GET https://shabforoosh.ir/wp-json/mapi/v1/post/all`
- **Exact Dart Parsing Function:**
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

## 🛑 SECTION 2: Dynamic Interleaving in `UnifiedCatalogService`

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

    // 1. Pick the best Hero Slider
    HomeSection? heroSlider = filimoSections.firstWhere((s) => s.isSlider, orElse: () => 
      gapfilmSections.firstWhere((s) => s.isSlider, orElse: () => filimoSections.isNotEmpty ? filimoSections.first : gapfilmSections.first)
    );
    interleaved.add(heroSlider);

    // 2. Filter out sliders from standard rails
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

---

## 🛑 SECTION 3: "مشاهده همه" (See All) Dedicated Archive with Infinite Scroll

### Button Tap on Home Rail Header:
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

### Full `SectionArchiveScreen` Pagination Logic:
When `ScrollController` hits the bottom (`pixels >= maxScrollExtent - 300`):
- **Engine D (Filimo):**
  - URL: `https://www.dwn.qanadbook.com/filmchi/api-gateway.php?secret=filimchi-secret-2026&url=` + `Uri.encodeComponent('https://www.filimo.com/api/fa/v1/movie/movie/list/tagid/${widget.rawId}/list_perpage/20/list_offset/$offset')`
  - Increment `offset += 20` (starts at 0, then 20, 40, 60...).
  - Extract items from `included` where `item['type'] == 'movies'`.
- **Engine B (Gapfilm):**
  - URL: `https://www.dwn.qanadbook.com/filmchi/api-gateway.php?secret=filimchi-secret-2026&url=` + `Uri.encodeComponent('https://core.gapfilm.ir/api/v3.3/GetFirstPageByPlatformPaging?EntityId=${widget.rawId}&EntityType=1&PlatformType=1&AgeRangeId=5&PageSize=20&PageIndex=$pageIndex')`
  - Increment `pageIndex += 1` (starts at 0, then 1, 2, 3...).
  - Extract items from `Result['Contents']`.
- **Engine A (Shabforoosh):**
  - URL: Base `widget.paginationUrl ?? 'https://shabforoosh.ir/wp-json/mapi/v1/post/movies'`.
  - Add query params: `page=$page&per_page=20` + spread `widget.extraParams ?? {}`.
  - Increment `page += 1` (starts at 1, then 2, 3...).
  - Extract items from `data` array.

---

## 🛑 SECTION 4: 100% Dynamic Categories Screen from Real Provider API

### The Extraction Bug Fixed:
Filimo categories response has attributes inside `item['attributes']`!
- **Endpoint:**
  `GET https://www.dwn.qanadbook.com/filmchi/api-gateway.php?secret=filimchi-secret-2026&url=https%3A%2F%2Fwww.filimo.com%2Fapi%2Ffa%2Fv1%2Fmenu%2Fmenu%2Fcategory`
- **Parsing Method:**
```dart
Future<List<CategoryItem>> fetchCategories() async {
  final url = 'https://www.dwn.qanadbook.com/filmchi/api-gateway.php?secret=filimchi-secret-2026&url=https%3A%2F%2Fwww.filimo.com%2Fapi%2Ffa%2Fv1%2Fmenu%2Fmenu%2Fcategory';
  final response = await http.get(Uri.parse(url));
  final json = jsonDecode(utf8.decode(response.bodyBytes)) as Map<String, dynamic>;
  final data = json['data'] as List<dynamic>? ?? [];

  return data.map((item) {
    final id = item['id']?.toString() ?? '';
    final attrs = item['attributes'] as Map<String, dynamic>? ?? {};
    String rawTitle = attrs['link_text']?.toString() ?? '';
    String cleanTitle = rawTitle.replaceAll('فیلیمو', '').trim();
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

### 2-Column Visual Card Grid:
- Render a 2-column grid using `coverUrl` as each card's background image with `CachedNetworkImage`.
- Dark translucent gradient overlay with genre-colored tint.
- Persian title in bold `Vazirmatn Black 18px` + English slug in uppercase.
- On card tap -> Open `CategoryDetailScreen(categoryId: item.id, categoryTitle: item.title)`.
- `CategoryDetailScreen` loads real items via Filimo pagination:
  `GET https://www.dwn.qanadbook.com/filmchi/api-gateway.php?secret=filimchi-secret-2026&url=` + `Uri.encodeComponent('https://www.filimo.com/api/fa/v1/movie/movie/list/tagid/${categoryId}/list_perpage/20/list_offset/$offset')`

---

## 🔒 White-Label Requirement
Ensure NO provider names ("فیلیمو", "گپ فیلم", "شب فروش", "شیدا") appear anywhere in the UI, labels, cards, or errors. The app is strictly branded as **"فیلمچی" (Filimchi)**.

---

## 🛠️ Complete Code Files to Generate:
1. `lib/core/models/catalog_models.dart` - Unified models.
2. `lib/core/services/unified_catalog_service.dart` - Full service with 3 real parsers and dynamic interleaving.
3. `lib/features/home/presentation/home_screen.dart` - Dynamic Home Screen rendering real Hero Slider + interleaved dynamic rails.
4. `lib/features/home/presentation/section_archive_screen.dart` - Full infinite-scrolling poster grid screen for "مشاهده همه".
5. `lib/features/categories/presentation/categories_screen.dart` - 2-column visual card grid fetching live categories from `/menu/menu/category`.
6. `lib/features/categories/presentation/category_detail_screen.dart` - Infinite-scrolling poster grid for category archive.

Generate the complete, robust Flutter code for these files now.
```
