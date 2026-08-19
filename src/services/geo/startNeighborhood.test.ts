import assert from "node:assert/strict";
import {
  mergeStartNeighborhood,
  readStartLatLngFromRaw,
  readStoredStartNeighborhood,
  resolveStartNeighborhood,
  shouldGeocodeDuringSync,
} from "./startNeighborhood";

function testReadStoredStartNeighborhood() {
  assert.equal(
    readStoredStartNeighborhood({ start_neighborhood: "Belvedere" }),
    "Belvedere",
  );
  assert.equal(readStoredStartNeighborhood({ start_latlng: [1, 2] }), undefined);
  assert.equal(readStoredStartNeighborhood(undefined), undefined);
  assert.equal(readStoredStartNeighborhood({ start_neighborhood: "  " }), undefined);
}

function testMergeStartNeighborhoodPreservesRaw() {
  const merged = mergeStartNeighborhood(
    { id: 1, start_latlng: [-19.97, -43.94] },
    "Belvedere",
  );
  assert.deepEqual(merged, {
    id: 1,
    start_latlng: [-19.97, -43.94],
    start_neighborhood: "Belvedere",
  });
}

function testReadStartLatLngFromRaw() {
  assert.deepEqual(
    readStartLatLngFromRaw({ start_latlng: [-19.973744, -43.941831] }),
    { lat: -19.973744, lon: -43.941831 },
  );
  assert.equal(readStartLatLngFromRaw({}), undefined);
  assert.equal(readStartLatLngFromRaw(undefined), undefined);
}

function testShouldGeocodeDuringSync() {
  assert.equal(shouldGeocodeDuringSync(0), false);
  assert.equal(shouldGeocodeDuringSync(1), true);
  assert.equal(shouldGeocodeDuringSync(10), true);
  assert.equal(shouldGeocodeDuringSync(11), false);
}

async function testResolveReturnsStoredNeighborhoodWithoutLookup() {
  let lookedUp = false;
  const name = await resolveStartNeighborhood(
    { start_neighborhood: "Belvedere", start_latlng: [-19.97, -43.94] },
    async () => {
      lookedUp = true;
      return "Other";
    },
  );
  assert.equal(name, "Belvedere");
  assert.equal(lookedUp, false);
}

async function testResolveLooksUpWhenMissing() {
  const name = await resolveStartNeighborhood(
    { start_latlng: [-19.973744, -43.941831] },
    async (lat, lon) => {
      assert.equal(lat, -19.973744);
      assert.equal(lon, -43.941831);
      return "Belvedere";
    },
  );
  assert.equal(name, "Belvedere");
}

async function testResolveSkipsLookupWithoutCoords() {
  let lookedUp = false;
  const name = await resolveStartNeighborhood({}, async () => {
    lookedUp = true;
    return "Belvedere";
  });
  assert.equal(name, undefined);
  assert.equal(lookedUp, false);
}

async function testResolveReturnsUndefinedWhenLookupThrows() {
  const name = await resolveStartNeighborhood(
    { start_latlng: [-19.973744, -43.941831] },
    async () => {
      throw new Error("network");
    },
  );
  assert.equal(name, undefined);
}

async function main() {
  testReadStoredStartNeighborhood();
  testMergeStartNeighborhoodPreservesRaw();
  testReadStartLatLngFromRaw();
  testShouldGeocodeDuringSync();
  await testResolveReturnsStoredNeighborhoodWithoutLookup();
  await testResolveLooksUpWhenMissing();
  await testResolveSkipsLookupWithoutCoords();
  await testResolveReturnsUndefinedWhenLookupThrows();
  console.log("startNeighborhood tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
