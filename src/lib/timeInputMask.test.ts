import assert from "node:assert/strict"
import { maskDurationRightAligned, maskMmSs } from "./timeInputMask"

// --- maskMmSs (5K): progressive mm:ss, no left-pad (keeps caret natural) ---

assert.equal(maskMmSs(""), "")
assert.equal(maskMmSs("2"), "2")
assert.equal(maskMmSs("28"), "28")
assert.equal(maskMmSs("280"), "2:80")
assert.equal(maskMmSs("2800"), "28:00")
assert.equal(maskMmSs("930"), "9:30")
assert.equal(maskMmSs("28001"), "28:00")
assert.equal(maskMmSs("28:00"), "28:00")
assert.equal(maskMmSs("ab3c5"), "35")
assert.equal(maskMmSs("ab3c50"), "3:50")

// --- maskDurationRightAligned (target time) ---

assert.equal(maskDurationRightAligned(""), "")
assert.equal(maskDurationRightAligned("3"), "3")
assert.equal(maskDurationRightAligned("35"), "35")
assert.equal(maskDurationRightAligned("350"), "3:50")
assert.equal(maskDurationRightAligned("3500"), "35:00")
assert.equal(maskDurationRightAligned("21500"), "2:15:00")
assert.equal(maskDurationRightAligned("215001"), "2:15:00")
assert.equal(maskDurationRightAligned("2:15:00"), "2:15:00")
assert.equal(maskDurationRightAligned("ab35cd00"), "35:00")

console.log("timeInputMask tests passed")
