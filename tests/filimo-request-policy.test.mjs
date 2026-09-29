import test from "node:test";
import assert from "node:assert/strict";
import { clearTimeout, setTimeout } from "node:timers";
import { URL } from "node:url";

const {
  getFilimoRequestTransport,
  normalizeFilimoAuthToken,
  requestThroughHttpsProxy,
  shouldUseFilimoProxy,
} = await import("../src/lib/providers/filimo/requestPolicy.ts");

test("authenticated playback follows the configured provider proxy", () => {
  assert.equal(shouldUseFilimoProxy({ auth: true }), false);
  assert.equal(
    shouldUseFilimoProxy({ auth: true }, "http://proxy.example:8080"),
    true,
  );
  assert.equal(
    getFilimoRequestTransport({ auth: true }, "http://proxy.example:8080"),
    "https-proxy-agent",
  );
});

test("direct fetch is the fallback when no proxy is configured", () => {
  assert.equal(shouldUseFilimoProxy({}), false);
  assert.equal(shouldUseFilimoProxy({ auth: false }), false);
  assert.equal(shouldUseFilimoProxy({}, undefined), false);
  assert.equal(getFilimoRequestTransport({ auth: true }), "direct");
});

test("an explicit proxy choice always wins", () => {
  assert.equal(shouldUseFilimoProxy({ auth: true, proxy: true }), true);
  assert.equal(shouldUseFilimoProxy({ auth: false, proxy: false }), false);
  assert.equal(
    getFilimoRequestTransport({}, "http://proxy.example:8080"),
    "https-proxy-agent",
  );
  assert.equal(
    getFilimoRequestTransport(
      { auth: true, proxy: false },
      "http://proxy.example:8080",
    ),
    "direct",
  );
});

test("bearer token normalization accepts configured Bearer values", () => {
  assert.equal(normalizeFilimoAuthToken("  Bearer   abc123  "), "abc123");
  assert.equal(normalizeFilimoAuthToken("abc123"), "abc123");
  assert.equal(normalizeFilimoAuthToken("   "), undefined);
  assert.equal(normalizeFilimoAuthToken(undefined), undefined);
});

test("an invalid proxy fails the real proxy transport instead of going direct", async () => {
  const controller = new globalThis.AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);
  try {
    await assert.rejects(
      requestThroughHttpsProxy(
        new URL("https://www.filimo.com/api/fa/v1/movie/movie/list/tagid/1000"),
        { Accept: "application/json" },
        "http://127.0.0.1:1",
        controller.signal,
      ),
    );
  } finally {
    clearTimeout(timeout);
  }
});
