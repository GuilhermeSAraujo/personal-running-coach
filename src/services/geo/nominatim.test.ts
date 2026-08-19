import assert from "node:assert/strict";
import {
  lookupStartNeighborhood,
  parseStartLatLng,
  pickStartNeighborhood,
} from "./nominatim";

function testParseStartLatLngFromNumbers() {
  assert.deepEqual(parseStartLatLng([-19.973744, -43.941831]), {
    lat: -19.973744,
    lon: -43.941831,
  });
}

function testParseStartLatLngFromNumericStrings() {
  assert.deepEqual(parseStartLatLng(["-19.973744", "-43.941831"]), {
    lat: -19.973744,
    lon: -43.941831,
  });
}

function testParseStartLatLngFromMongoDoubleLike() {
  const lat = { valueOf: () => -19.973744 };
  const lon = { valueOf: () => -43.941831 };
  assert.deepEqual(parseStartLatLng([lat, lon]), {
    lat: -19.973744,
    lon: -43.941831,
  });
}

function testParseStartLatLngRejectsMissing() {
  assert.equal(parseStartLatLng(undefined), undefined);
  assert.equal(parseStartLatLng(null), undefined);
  assert.equal(parseStartLatLng([]), undefined);
  assert.equal(parseStartLatLng([-19.973744]), undefined);
}

function testParseStartLatLngRejectsNonFinite() {
  assert.equal(parseStartLatLng([NaN, -43.941831]), undefined);
  assert.equal(parseStartLatLng([-19.973744, "not-a-number"]), undefined);
}

function testParseStartLatLngRejectsZeroZero() {
  assert.equal(parseStartLatLng([0, 0]), undefined);
  assert.equal(parseStartLatLng([0.0, 0.0]), undefined);
}

function testPickPrefersNeighbourhood() {
  assert.equal(
    pickStartNeighborhood({
      neighbourhood: "Belvedere",
      suburb: "Other",
    }),
    "Belvedere",
  );
}

function testPickFallsBackToSuburb() {
  assert.equal(
    pickStartNeighborhood({
      suburb: "Belvedere",
    }),
    "Belvedere",
  );
}

function testPickReturnsUndefinedWhenNeither() {
  assert.equal(pickStartNeighborhood({ city: "Belo Horizonte" }), undefined);
  assert.equal(pickStartNeighborhood(undefined), undefined);
  assert.equal(pickStartNeighborhood(null), undefined);
}

async function testLookupCallsNominatimWithUserAgent() {
  const originalFetch = globalThis.fetch;
  const calls: { url: string; userAgent: string | null }[] = [];

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({
      url: String(input),
      userAgent: new Headers(init?.headers).get("User-Agent"),
    });
    return new Response(
      JSON.stringify({
        address: {
          neighbourhood: "Belvedere",
          suburb: "Belvedere",
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  try {
    const name = await lookupStartNeighborhood(-19.973744, -43.941831);
    assert.equal(name, "Belvedere");
    assert.equal(calls.length, 1);
    assert.equal(
      calls[0].url,
      "https://nominatim.openstreetmap.org/reverse?lat=-19.973744&lon=-43.941831&format=jsonv2&addressdetails=1",
    );
    assert.equal(
      calls[0].userAgent,
      "personal-running-coach/0.1 (local reverse-geocode)",
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function testLookupReturnsUndefinedOnHttpError() {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response("rate limited", { status: 429 })) as typeof fetch;

  try {
    const name = await lookupStartNeighborhood(-19.973744, -43.941831);
    assert.equal(name, undefined);
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function testLookupReturnsUndefinedWhenAddressMissing() {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ display_name: "somewhere" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })) as typeof fetch;

  try {
    const name = await lookupStartNeighborhood(-19.973744, -43.941831);
    assert.equal(name, undefined);
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function main() {
  testParseStartLatLngFromNumbers();
  testParseStartLatLngFromNumericStrings();
  testParseStartLatLngFromMongoDoubleLike();
  testParseStartLatLngRejectsMissing();
  testParseStartLatLngRejectsNonFinite();
  testParseStartLatLngRejectsZeroZero();
  testPickPrefersNeighbourhood();
  testPickFallsBackToSuburb();
  testPickReturnsUndefinedWhenNeither();
  await testLookupCallsNominatimWithUserAgent();
  await testLookupReturnsUndefinedOnHttpError();
  await testLookupReturnsUndefinedWhenAddressMissing();

  console.log("nominatim tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
