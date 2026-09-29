# 🚨 پرامپت اصلاح فوری: حل مشکل «مشاهده همه» و «دسته‌بندی‌های زنده پروایدرها»
## ویژه Google AI Studio / Cursor

> **راهنمای استفاده:** کل متن انگلیسی زیر را کپی کرده و به هوش مصنوعی در همان چت اپلیکیشن ارسال کنید. این پرامپت دو ایراد اساسی پروژه را دقیقاً ریشه‌یابی و برطرف می‌کند:
> ۱. باز شدن صفحه اختصاصی برای «مشاهده همه» هر ریل (به جای پریدن به تب دسته‌بندی‌ها) همراه با صفحه‌بندی نامحدود (Infinite Scroll).
> ۲. دریافت ۱۰۰٪ زنده و واقعی دسته‌بندی‌ها از وب‌سرویس پروایدرها به همراه تصاویر کاور باکیفیت و اتصال به آرشیو واقعی.

---

```markdown
# Urgent Fix & Refactoring Instructions: Section "See All" & Dynamic Live Categories
You are a Principal Mobile Architect and Senior Flutter/React Native Engineer.
The previous implementation of our video streaming app **"فیلمچی" (Filimchi)** has two critical flaws that must be fixed immediately:

---

## ❌ FLAW 1 (CRITICAL BUG): "مشاهده همه" (See All) Opens Categories Tab Instead of Section Archive
### Problem:
In the Home Screen rails, when the user taps "مشاهده همه" (See All) on any section (e.g. "ویژه", "جدیدترین فیلم‌ها", "اکشن"), the app incorrectly navigates to the generic Categories bottom nav tab (`/categories` or `currentIndex = 1`)!
This is wrong. Tapping "مشاهده همه" must open a dedicated **`SectionArchiveScreen`** that fetches the real, remaining paginated items of THAT specific section from the provider!

### The Required Fix:
1. **Create `SectionArchiveScreen`:**
   - Accepts parameters:
     - `sectionId`: (e.g. tag ID, category ID, or section slug).
     - `sectionTitle`: (e.g. "منتخب‌ها", "جدیدترین فیلم‌ها", "ویژه").
     - `engineType`: (`SourceEngineA`, `SourceEngineB`, `SourceEngineD` - hidden internally from UI).
     - `initialItems`: The preloaded items already in memory for instant display.
2. **Infinite Scroll Pagination:**
   - Render a 2-column or 3-column responsive poster grid (`GridView.builder` / `FlatList`).
   - Listen to scroll controller. When the user reaches the bottom (`pixels >= maxScrollExtent - 200`), fetch the next page:
     - **For Engine D (Filimo Sections):**
       `GET https://www.dwn.qanadbook.com/filmchi/api-gateway.php?secret=filimchi-secret-2026&url=${Uri.encodeComponent('https://www.filimo.com/api/fa/v1/movie/movie/list/tagid/' + sectionId + '/list_perpage/20/list_offset/' + offset)}`
       *(offset increments by 20: 0, 20, 40, 60...)*
     - **For Engine B (Gapfilm Sections):**
       `GET https://www.dwn.qanadbook.com/filmchi/api-gateway.php?secret=filimchi-secret-2026&url=${Uri.encodeComponent('https://core.gapfilm.ir/api/v3.3/GetCategoryContentByPlatform?PlatformId=1&CategoryId=' + sectionId + '&PageSize=20&PageIndex=' + pageIndex)}`
     - **For Engine A (Shabforoosh Sections):**
       `GET https://shabforoosh.ir/wp-json/mapi/v1/post/${sectionType}?page=${page}&per_page=20`
   - Append fetched items to the grid with a sleek bottom loader.
3. **Wire Home Screen "مشاهده همه" Button:**
   - In `HomeScreen`, on each rail header:
     ```dart
     onTapSeeAll: () {
       Navigator.push(
         context,
         MaterialPageRoute(
           builder: (context) => SectionArchiveScreen(
             sectionId: section.id,
             sectionTitle: section.title,
             engineType: section.engineType,
             initialItems: section.items,
           ),
         ),
       );
     }
     ```

---

## ❌ FLAW 2: Hardcoded Static Categories
### Problem:
The Categories tab is using static, fake, or hardcoded category cards instead of dynamically fetching the real categories from the provider APIs.

### The Required Fix:
1. **Fetch Real Dynamic Categories from Provider API:**
   - Replace any hardcoded lists in `CategoriesScreen`.
   - Call the live Categories endpoint through the Iranian Gateway:
     ```http
     GET https://www.dwn.qanadbook.com/filmchi/api-gateway.php?secret=filimchi-secret-2026&url=https%3A%2F%2Fwww.filimo.com%2Fapi%2Ffa%2Fv1%2Fmenu%2Fmenu%2Fcategory
     Headers:
       useragent: {"os":"react","pf":"site"}
       jsonType: simple
     ```
   - **Response Structure (REAL LIVE DATA):**
     Each item contains:
     - `id`: Unique Genre ID (e.g. `1000056` for Action, `1000060` for Comedy, `1000051` for Animation, `1000063` for Horror, `1000059` for Sci-Fi, `1000053` for Drama).
     - `link_text`: Persian Category Title (e.g. "اکشن", "کمدی", "انیمیشن", "وحشت", "علمی تخیلی").
     - `link_key`: Genre slug (e.g. "action", "comedy", "animation", "horror").
     - `link_cover`: **REAL High-Resolution Backdrop Image URL!**
       (e.g. `https://www.filimo.com/assets/web/ui/img-kmamKASrNEVPtLinT60Q/filimo/categories/fa/new_branding/1000056.jpg`)
2. **Build the 2-Column Visual Card Grid:**
   - Render these live categories in a 2-column grid.
   - Each card displays:
     - The real `link_cover` as the background image.
     - Dark translucent gradient overlay with subtle genre color glow.
     - Persian title (`link_text`) in `Vazirmatn Black 18px`.
     - English slug (`link_key.toUpperCase()`).
     - Live item count badge if available or aesthetic counter pill.
3. **Handle Category Card Tap:**
   - When the user taps a category card (e.g. "اکشن", ID: `1000056`):
     - Navigate to `CategoryDetailScreen(categoryId: category.id, categoryTitle: category.link_text)`:
     - Fetch the real movies and series belonging to that category with infinite scroll:
       `GET https://www.dwn.qanadbook.com/filmchi/api-gateway.php?secret=filimchi-secret-2026&url=${Uri.encodeComponent('https://www.filimo.com/api/fa/v1/movie/movie/list/tagid/' + category.id + '/list_perpage/20/list_offset/' + offset)}`
     - Parse JSONAPI `included[]` for movie/series items (`movie_title`, `pic.movie_img_m`, `duration`, `imdb_rate`, `uid`).

---

## 🔒 White-Label Reminder
Ensure NO provider names ("فیلیمو", "گپ فیلم", "شب فروش", "شیدا") appear anywhere in the UI of `SectionArchiveScreen` or `CategoryDetailScreen`. The app is strictly branded as **"فیلمچی" (Filimchi)**.

---

## 🛠️ Files to Provide
1. `lib/features/home/presentation/section_archive_screen.dart` - Dedicated paginated screen for "مشاهده همه".
2. `lib/features/categories/presentation/categories_screen.dart` - Dynamic category fetcher using live API + covers.
3. `lib/features/categories/presentation/category_detail_screen.dart` - Infinite scrolling grid for tapped categories.
4. Updated `HomeScreen` wiring connecting "مشاهده همه" to `SectionArchiveScreen`.

Implement these fixes cleanly now.
```
