/*
 * A probe for the one thing an ingesting engine may never do.
 *
 * PART 12 pins the wire shape with `additionalProperties: false`. The engines
 * disagree about what to do with a property the schema does not name - carve-php
 * refuses the payload, carve-rs drops it, carve-js echoes it back
 * (carve-js#709) - and which of refuse-or-drop is right is open for §9
 * (carve#743).
 *
 * These helpers do not touch that question. Refusing is fine and so is dropping.
 * What is never fine is ACCEPTING and then re-publishing, because the result is
 * a tree the format rejects and the consumer that reads it and passes it on has
 * no way to know. Stated that way the bar follows from the schema contract that
 * already exists, so it can be measured before the decision lands.
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
