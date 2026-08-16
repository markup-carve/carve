/*
 * WHICH FIELDS CARRY THE U+E000 NO-BREAK SPACE SENTINEL.
 *
 * Nothing pinned this. `resources/ast-schema.json` documented the sentinel on
 * `text.value` and on nothing else, while the engines emit it on four fields
 * and resolve all four to a no-break space - so a consumer that followed the
 * schema alone handled a quarter of what it would receive. That is not a
 * hypothetical: carve-sile passed the sentinel through to SILE, which drew the
 * font's `.notdef` glyph for it - `Td[<0000>]TJ` in the PDF stream, a visible
 * box, no warning (carve#1242).
 *
 * The reason the gap survived is the one carve#755 catalogs: the only check
 * that touched the sentinel was `scripts/spec/ast-positions.mjs`, which SKIPS a
 * `text.value` carrying it. A skip cannot report a field it does not look at,
 * so the schema could describe one field out of four indefinitely.
 *
 * So this file pins the set in BOTH directions, against the pinned build:
 *
 *   - a field that carries the sentinel and is not documented fails;
 *   - a field documented as carrying it that no longer does fails as stale.
 *
 * `raw_block.content` is the control. It carries the character too, and it is
 * deliberately NOT sentinel-bearing: raw content is handed to its target byte
 * for byte, so a U+E000 in it is a byte the author put there. Without the
 * control this file would pass by declaring every string field.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { carveToAstJson, carveToHtml } from '@markup-carve/carve'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')

const SENTINEL = ''

/** The four `type.field` pairs PART 12 §3 and the schema say may carry it. */
const BEARING = ['code.value', 'code_block.content', 'literal_inline.content', 'text.value']

/** Carries the character, is NOT the sentinel, and must be documented as such. */
const PASSTHROUGH = 'raw_block.content'

/*
 * One probe per documented source, written with the character in it rather than
 * with an escape, so a fixture cannot drift from what it claims to exercise.
 *
 * The line block is the source a reader who has only seen `\ ` misses, and the
 * one the schema never mentioned outside a parenthetical: its preserved
 * indentation is a RUN of the sentinel, one per space.
 */
const PROBES = {
  'an escaped space': 'a\\ b\n',
  'an authored sentinel in text': `a${SENTINEL}b\n`,
  'an authored sentinel in a code span': `x \`a${SENTINEL}b\` y\n`,
  'an authored sentinel in a code block': `\`\`\`\na${SENTINEL}b\n\`\`\`\n`,
  'an authored sentinel in a literal inline': `x !\`a${SENTINEL}b\` y\n`,
  'an authored sentinel in a raw block': `\`\`\`=html\n<i>a${SENTINEL}b</i>\n\`\`\`\n`,
  "a line block's preserved indentation": '::: |\na\n    b\n:::\n',
}

/** Every `type.field` in a serialized tree whose string value holds U+E000. */
function bearingFields(node, found = new Set()) {
  if (Array.isArray(node)) {
    for (const child of node) bearingFields(child, found)
    return found
  }
  if (!node || typeof node !== 'object') return found
  for (const [key, value] of Object.entries(node)) {
    if (typeof value === 'string') {
      if (value.includes(SENTINEL)) found.add(`${node.type}.${key}`)
    } else {
      bearingFields(value, found)
    }
  }
  return found
}

const schema = JSON.parse(readFileSync(resolve(root, 'resources/ast-schema.json'), 'utf8'))

/** The `type.field` pairs whose schema description names the sentinel. */
function documentedFields() {
  const named = []
  for (const def of Object.values(schema.$defs)) {
    const type = def.properties?.type?.const
    if (!type) continue
    for (const [field, spec] of Object.entries(def.properties)) {
      const description = spec.description ?? ''
      // The passthrough field names U+E000 to EXCLUDE itself, so a mention is
      // not enough - the description has to claim the field carries it.
      if (description.includes('May contain U+E000')) named.push(`${type}.${field}`)
    }
  }
  return named.sort()
}

test('the probes reach the parser, so this file can fail', () => {
  const reached = Object.values(PROBES).filter(
    (source) => bearingFields(carveToAstJson(source)).size > 0,
  )
  assert.equal(reached.length, Object.keys(PROBES).length, 'a probe produced no sentinel at all')
})

test('the sentinel lands on exactly the four documented fields', () => {
  const found = new Set()
  for (const source of Object.values(PROBES)) {
    for (const field of bearingFields(carveToAstJson(source))) found.add(field)
  }
  found.delete(PASSTHROUGH)
  assert.deepEqual(
    [...found].sort(),
    [...BEARING].sort(),
    'the fields the engine puts U+E000 on are not the fields PART 12 documents',
  )
})

test("a line block's indentation is a RUN of the sentinel, one per space", () => {
  const ast = carveToAstJson(PROBES["a line block's preserved indentation"])
  const runs = []
  const collect = (node) => {
    if (Array.isArray(node)) return node.forEach(collect)
    if (!node || typeof node !== 'object') return
    if (node.type === 'text' && typeof node.value === 'string' && node.value.includes(SENTINEL)) {
      runs.push(node.value.match(new RegExp(`${SENTINEL}+`))[0].length)
    }
    for (const value of Object.values(node)) if (typeof value !== 'string') collect(value)
  }
  collect(ast)
  assert.deepEqual(runs, [4], 'a four-space line-block indent is not four sentinels')
})

test('the schema documents the sentinel on those four fields and no others', () => {
  assert.deepEqual(
    documentedFields(),
    [...BEARING].sort(),
    'resources/ast-schema.json describes a different set than the engine produces',
  )
})

test('the passthrough field is documented as EXCLUDED, not as bearing', () => {
  const [type, field] = PASSTHROUGH.split('.')
  const description = schema.$defs[type].properties[field].description ?? ''
  assert.match(description, /U\+E000/, `${PASSTHROUGH} does not mention the sentinel at all`)
  assert.match(description, /NOT the no-break space/, `${PASSTHROUGH} does not say it is excluded`)
  assert.doesNotMatch(description, /May contain U\+E000/)
})

test('every bearing field resolves to a no-break space in the HTML render', () => {
  const unresolved = []
  for (const [name, source] of Object.entries(PROBES)) {
    if (name.includes('raw block')) continue
    const html = carveToHtml(source)
    if (html.includes(SENTINEL)) unresolved.push(`${name}: ${JSON.stringify(html)}`)
    if (!html.includes('&nbsp;')) unresolved.push(`${name}: no &nbsp; in ${JSON.stringify(html)}`)
  }
  assert.deepEqual(unresolved, [], 'a sentinel reached the HTML output, or resolved to nothing')
})

test('the raw block passes the character through untouched', () => {
  // The other half of the control. The renderer must NOT resolve this one, or
  // the payload a raw block exists to carry unexamined has been rewritten.
  const html = carveToHtml(PROBES['an authored sentinel in a raw block'])
  assert.ok(html.includes(SENTINEL), `raw passthrough resolved the character: ${JSON.stringify(html)}`)
})

/*
 * The probes are hand-written, so they can only pin the sources someone thought
 * of. This sweep is the other half: if a corpus document ever puts the sentinel
 * on a fifth field, it is red here rather than discovered by a consumer.
 */
test('no corpus document puts the sentinel on an undocumented field', () => {
  const corpusDir = resolve(root, 'tests/corpus')
  const documents = readdirSync(corpusDir).filter((f) => f.endsWith('.crv')).sort()
  assert.ok(documents.length >= 10, `found ${documents.length} corpus documents`)
  const undocumented = new Map()
  for (const name of documents) {
    const source = readFileSync(resolve(corpusDir, name), 'utf8')
    for (const field of bearingFields(carveToAstJson(source))) {
      if (BEARING.includes(field) || field === PASSTHROUGH) continue
      undocumented.set(field, name)
    }
  }
  assert.deepEqual(
    [...undocumented].map(([field, name]) => `${field} (${name})`),
    [],
    'a corpus document carries U+E000 on a field PART 12 does not document',
  )
})
