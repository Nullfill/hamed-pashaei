import test from "node:test";
import assert from "node:assert/strict";

const {
  collectMediaItems,
  parseHomeSections,
  parseSectionPage,
} = await import("../src/lib/providers/filimo/parsers.ts");

function jsonApiFixture() {
  return {
    data: [
      {
        type: "rows",
        id: "10",
        attributes: {
          output_type: "movie",
          link_key: "irbestsell",
          link_text: "پرفروش‌ها",
          more_type: "infinity",
          tag_id: "609",
          links: {
            next: "https://www.filimo.com/api/fa/v1/movie/movie/loadmore/tagid/609/more_type/infinity/page/2",
            more_records: true,
          },
        },
        relationships: {
          movies: {
            data: [
              { type: "movies", id: "m1" },
              { type: "movies", id: "m2" },
            ],
          },
        },
      },
    ],
    included: [
      {
        type: "movies",
        id: "m1",
        attributes: {
          uid: "m1",
          movie_title: "فیلم یک",
          movie_title_en: "One",
          pic: "https://cdn.example/one.jpg",
          serial: false,
        },
      },
      {
        type: "movies",
        id: "m2",
        attributes: {
          uid: "m2",
          movie_title: "فیلم دو",
          pic: "https://cdn.example/two.jpg",
          serial: false,
        },
      },
    ],
    meta: { id: "609", title: "پرفروش‌ها", per_page: 40 },
  };
}

test("Filimo JSON:API relationships are resolved into home sections", () => {
  const payload = jsonApiFixture();
  const sections = parseHomeSections(payload);
  assert.equal(sections.length, 1);
  assert.equal(sections[0].sourceId, "irbestsell");
  assert.deepEqual(
    sections[0].items.map((item) => item.id),
    ["m1", "m2"],
  );
  assert.equal(collectMediaItems(payload).length, 2);
});

test("Filimo section parser preserves the load-more cursor", () => {
  const section = parseSectionPage(jsonApiFixture(), "irbestsell", 1);
  assert.equal(section.items.length, 2);
  assert.equal(section.isInfinite, true);
  assert.equal(section.hasMore, true);
  assert.match(section.nextUrl, /loadmore\/tagid\/609/);
});

test("Filimo section parser stops when the upstream says there are no more records", () => {
  const payload = jsonApiFixture();
  payload.data[0].attributes.links.more_records = "false";
  const section = parseSectionPage(payload, "irbestsell", 2);
  assert.equal(section.hasMore, false);
});
