/**
 * Whether a completed comparison run contains a failure the CLI must gate on.
 *
 * Kept separate from presentation so every reported failure class is directly
 * executable in a small regression test.
 */
export function comparisonGateHasFailures(counts) {
  return Object.values(counts).some((count) => count > 0)
}
