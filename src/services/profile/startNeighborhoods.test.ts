import assert from "node:assert/strict";
import { mapNeighborhoodCounts } from "./startNeighborhoods";

function testReturnsEmptyForEmptyInput() {
  assert.deepEqual(mapNeighborhoodCounts([]), []);
}

function testMapsValidRows() {
  assert.deepEqual(
    mapNeighborhoodCounts([
      { _id: "Belvedere", count: 5 },
      { _id: "Centro", count: 4 },
    ]),
    [
      { name: "Belvedere", count: 5 },
      { name: "Centro", count: 4 },
    ],
  );
}

function testSortsByCountDescendingThenName() {
  assert.deepEqual(
    mapNeighborhoodCounts([
      { _id: "Savassi", count: 2 },
      { _id: "Centro", count: 4 },
      { _id: "Belvedere", count: 4 },
    ]),
    [
      { name: "Belvedere", count: 4 },
      { name: "Centro", count: 4 },
      { name: "Savassi", count: 2 },
    ],
  );
}

function testTrimsNamesAndSkipsBlank() {
  assert.deepEqual(
    mapNeighborhoodCounts([
      { _id: "  Belvedere  ", count: 3 },
      { _id: "   ", count: 2 },
      { _id: "", count: 1 },
    ]),
    [{ name: "Belvedere", count: 3 }],
  );
}

function testSkipsInvalidIdsAndCounts() {
  assert.deepEqual(
    mapNeighborhoodCounts([
      { _id: "Centro", count: 4 },
      { _id: 12, count: 9 },
      { _id: null, count: 8 },
      { _id: "Savassi", count: 0 },
      { _id: "Lourdes", count: -1 },
      { _id: "Funcionarios", count: Number.NaN },
      { _id: "Pampulha", count: "3" },
    ]),
    [{ name: "Centro", count: 4 }],
  );
}

testReturnsEmptyForEmptyInput();
testMapsValidRows();
testSortsByCountDescendingThenName();
testTrimsNamesAndSkipsBlank();
testSkipsInvalidIdsAndCounts();
console.log("startNeighborhoods tests passed");
