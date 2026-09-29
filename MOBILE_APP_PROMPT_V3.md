# Master Project Blueprint: Flutter Mobile Client for "فیلمچی" (Powered by Next.js Backend)

You are a Principal Mobile Architect and Senior Flutter Engineer.
Your mission is to build the complete, production-ready mobile streaming application **"فیلمچی" (Filimchi)** for Android & iOS.

**CRITICAL ARCHITECTURE SHIFT:** 
Previously, the app tried to scrape Filimo, Gapfilm, and Shabforoosh directly in Dart. This caused endless bugs, IP bans, and fake hardcoded sections. 
**WE NOW HAVE A STABLE NEXT.JS BACKEND API.** 
Your job is ONLY to build a beautiful Flutter UI that consumes our standard JSON API. 
DO NOT write any HTML parsing, web scraping, or provider-specific logic in Dart. 

---

## 🚫 ABSOLUTE ZERO-MOCK & ZERO-HARDCODED MANDATE
1. **NO Mock Data:** DO NOT generate dummy movie arrays or placeholder mock lists.
2. **NO Hardcoded Section Names:** The Home Screen rails MUST NOT use hardcoded titles. You must map() over the sections array returned by the API.
3. **Provider Anonymity:** NEVER expose the names "Filimo", "Gapfilm", "Shabforoosh" in the UI.

---

## 📡 The Filimchi Backend API (Base URL: https://film-nine-ruby.vercel.app/api/v1)

### 1. Home Feed (`GET /home`)
Returns interleaved sections (Sliders and Rails) from all providers dynamically.
**Response Structure:**
```json
{
  "success": true,
  "data": {
    "sections": [
      {
        "id": "shabforoosh-mapi-0-movies",
        "title": "جدیدترین فیلم ها",
        "type": "slider",
        "provider": "shabforoosh",
        "items": [
          {
            "id": "606937",
            "type": "movie",
            "title": "خانه تابستانی",
            "poster": "https://...",
            "backdrop": "https://...",
            "rating": "5.5",
            "badges": ["زیرنویس"]
          }
        ],
        "hasMore": true,
        "sourceId": "base64-encoded-id"
      }
    ]
  }
}
```
**App Behavior:** 
- If `type == "slider"`, render a full-bleed HeroSlider at the top.
- If `type == "rail"`, render a horizontal SectionRail of movie posters.
- The "See All" button should navigate to a SectionArchiveScreen passing the provider and sourceId to `GET /sections/{provider}/{sourceId}?page=1`.

### 2. Section Archive (`GET /sections/{provider}/{sourceId}?page={page}`)
Used for "See All" infinite scrolling.

### 3. Media Details (`GET /media/{provider}/{type}/{id}`)
Fetches complete details (synopsis, cast, trailers, stream links, and episodes if it's a series).
**Response Structure:**
```json
{
  "success": true,
  "data": {
    "id": "606937",
    "type": "movie",
    "title": "خانه تابستانی",
    "description": "...",
    "poster": "...",
    "backdrop": "...",
    "streams": [
      {
        "url": "https://film-nine-ruby.vercel.app/api/provider-media?url=...",
        "quality": "1080p",
        "type": "hls"
      }
    ],
    "episodes": [
      {
        "id": "ep1",
        "title": "قسمت 1",
        "season": 1,
        "episode": 1
      }
    ]
  }
}
```
**App Behavior:** 
- `streams` contains direct video links. Pass the url directly to your Flutter video player (e.g., chewie or better_player). The Next.js API automatically proxies and bypasses all premium/IP restrictions.

### 4. Search (`GET /search?q={query}`)
Returns a unified array of MediaItem.

### 5. Catalog (`GET /catalog?type={movie|series}`)
Returns dynamic rails specifically for movies or series.

---

## 🛠️ Flutter Implementation Details
1. **API Key Setup:** Set `MOBILE_API_REQUIRE_KEY=0` in Vercel Environment Variables to disable API keys during local testing, OR generate an API Key from the Admin Panel (`/admin/api-clients`) and pass it in the `X-API-Key` header.
2. **State Management:** Use Riverpod or Bloc for managing API calls and UI state.
3. **Video Player:** Use a robust HLS-compatible player capable of playing .m3u8 and .mp4.
4. **Images:** Use cached_network_image to efficiently load posters and backdrops.

Generate the complete Flutter project structure, Data Models, API Service, and UI Screens based on this backend.
