import test from "node:test";
import assert from "node:assert/strict";

const {
  parseSheydaDetails,
  parseSheydaPlayback,
  parseSheydaPrograms,
  sheydaEpisode,
  toSheydaMediaItem,
} = await import("../src/lib/providers/sheyda/parsers.ts");

const program = {
  id: "internal-id",
  uid: "movie-uid",
  title: "فیلم آزمایشی",
  productionYear: 2026,
  isSolitary: true,
  isExclusive: true,
  portraitImagePath: "https://static-s.sheyda.com/poster.jpg",
  landscapeImagePath: "https://static-s.sheyda.com/backdrop.jpg",
  episode: { accessType: "FREE" },
};

test("Sheyda programs use public uid and infer movie/series type", () => {
  const movie = toSheydaMediaItem(program);
  const series = toSheydaMediaItem({ ...program, uid: "series-uid", isSolitary: false });
  assert.equal(movie.id, "movie-uid");
  assert.equal(movie.type, "movie");
  assert.equal(series.type, "series");
  assert.deepEqual(movie.badges, ["2026", "اختصاصی شیدا", "رایگان"]);
});

test("Sheyda browse parser filters the requested media type", () => {
  const result = parseSheydaPrograms({
    data: [program, { ...program, uid: "series-uid", isSolitary: false }],
    pagination: { totalPages: 3 },
  }, 2, "series");
  assert.deepEqual(result.items.map((item) => item.id), ["series-uid"]);
  assert.equal(result.page, 2);
  assert.equal(result.totalPages, 3);
});

test("Sheyda episode and details map into the shared provider contract", () => {
  const episode = sheydaEpisode({
    uid: "episode-uid",
    title: "قسمت دوم",
    order: 2,
    duration: 1800,
    releaseStatus: "RELEASED",
  }, 1, 1);
  const details = parseSheydaDetails({
    program: { ...program, isSolitary: false },
    genres: [{ id: "genre", name: "درام" }],
    cast: [{ role: "DIRECTOR", artists: [{ id: "director", fullName: "کارگردان" }] }],
  }, [episode]);
  assert.equal(details.type, "series");
  assert.equal(details.episodes[0].playbackId, "episode-uid");
  assert.equal(details.directors[0].name, "کارگردان");
  assert.deepEqual(details.genres, ["درام"]);
});

test("Sheyda HLS playback is routed through the same-origin media proxy", () => {
  const playback = parseSheydaPlayback({
    playLink: "https://cdn-pub-me.sheyda.com/video/master.m3u8",
    subtitleMetadata: [{ url: "https://static-s.sheyda.com/fa.vtt", langCode: "fa" }],
  });
  assert.equal(playback.sources.length, 1);
  assert.match(playback.sources[0].src, /^\/api\/provider-media\?url=/);
  assert.equal(playback.sources[0].type, "application/vnd.apple.mpegurl");
  assert.equal(playback.sources[0].subtitleFa, "https://static-s.sheyda.com/fa.vtt");
});
