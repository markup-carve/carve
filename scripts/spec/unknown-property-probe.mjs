/*
 * A probe for the one thing an ingesting engine may never do.
 *
 * PART 12 pins the wire shape with `additionalProperties: false`. The engines
 * used to disagree about what to do with a property the schema does not name -
 * carve-php refused the payload, carve-rs dropped it, carve-js echoed it back
 * (carve-js#709) - and this probe was written while that was open, so it only
 * refused to accept the ECHO.
 *
 * §11 has since decided it: an ingest MUST REFUSE, with a typed error naming
 * the property and its path. Not a silent drop, for the reason §9(b) gives
 * about depth - the caller is told the tree was accepted and learns nothing
 * about what went missing. So the runner now reports a drop too, and these
 * helpers stayed the same: they measure what came back, and the runner decides
 * what that means.
 *
 * Kept here as pure functions so tests can drive them without an engine: the
 * version inside the runner could only be exercised by having an engine that
 * echoes, which is the thing being looked for.
 */

/** Deliberately not a name the schema has ever had. `refId` was found by hand
 * precisely because it looked like a real field, and a probe that could be
 * mistaken for one would measure the wrong thing. */
export const UNKNOWN_PROPERTY_PROBE = 'zzProbeNotInTheSchema'

/**
 * Set the probe on every object carrying a `type`, and report how many.
 *
 * Nodes are the unit rather than objects: `pos` and `attrs` are shared shapes
 * with their own rules, and an engine rebuilding one of them field by field is
 * not the behavior under test.
 */
export function injectUnknownProperty(node, count = { n: 0 }) {
  if (Array.isArray(node)) {
    for (const item of node) injectUnknownProperty(item, count)

    return count
  }
  if (!node || typeof node !== 'object') return count
  if (typeof node.type === 'string') {
    node[UNKNOWN_PROPERTY_PROBE] = 'probe'
    count.n += 1
  }
  for (const value of Object.values(node)) injectUnknownProperty(value, count)

  return count
}

/** How many probes survived a round trip. */
export function countProbes(node) {
  let total = 0
  const walk = (current) => {
    if (Array.isArray(current)) return current.forEach(walk)
    if (!current || typeof current !== 'object') return
    if (UNKNOWN_PROPERTY_PROBE in current) total += 1
    for (const value of Object.values(current)) walk(value)
  }
  walk(node)

  return total
}

/**
 * What an ingest's answer to the probe means, as a finding or `null`.
 *
 * SEPARATED FROM THE RUNNER on purpose. The runner's copy could only be reached
 * by having an engine that misbehaves, which is the thing being looked for - so
 * the branch that decides "this is a finding" was the one part of the apparatus
 * nothing exercised. Now the runner measures and this decides, and a test can
 * drive every verdict without an engine.
 *
 * `refused` means the ingest threw. That is the conformant answer and now the
 * only one: PART 12 §11 requires a typed refusal naming the property, and rules
 * out the silent drop for the reason §9(b) gives about depth - the caller is
 * told the tree was accepted and learns nothing about what went missing.
 */
export function unknownPropertyVerdict({ refused, injected, echoed }) {
  if (refused) return null
  if (echoed > 0) {
    return (
      `ingest echoed an unknown property on ${echoed} of ${injected} node(s), ` +
      'so the re-published tree is invalid per additionalProperties: false (PART 12 §11)'
    )
  }

  return (
    `ingest accepted a tree with an unknown property on ${injected} node(s) and ` +
    'dropped it silently; §11 requires a typed refusal naming the property'
  )
}
