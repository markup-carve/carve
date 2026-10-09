/*
 * CARVE-P2-030's shape test, so the clause has one executable reading the
 * engines and this repo's oracles can be measured against.
 */

const QUOTED_KEY = /^(?:"(?:[^"\\]|\\.)*"|'(?:[^']|'')*')\s*:(?:[ \t]|$)/
// The key "holds no `:`", so a colon is excluded at the first position too.
const BARE_KEY = /^[^\s\-[{"'#:][^:]*:(?:[ \t]|$)/

/** Does a BARE `---` block's body shape as a mapping? */
export const shapesAsMapping = (lines) => {
  const first = lines.find((line) => line.trim() !== '' && line.trimStart()[0] !== '#')
  if (first === undefined) return false
  return QUOTED_KEY.test(first) || BARE_KEY.test(first)
}

/**
 * The offset just past the closer of a leading `---` block that CARVE-P2-030
 * calls frontmatter, or -1 when the source opens with no such block.
 */
export const frontmatterEnd = (source) => {
  const match = /^---[ ]?([A-Za-z0-9]*)\n/.exec(source)
  if (!match) return -1
  const lines = source.slice(match[0].length).split('\n')
  const closer = lines.indexOf('---')
  if (closer === -1) return -1
  // A typed opener is frontmatter unconditionally; only the bare spelling
  // collides with a thematic break, so only it takes the test.
  if (match[1] === '' && !shapesAsMapping(lines.slice(0, closer))) return -1
  return match[0].length + lines.slice(0, closer + 1).join('\n').length + 1
}
