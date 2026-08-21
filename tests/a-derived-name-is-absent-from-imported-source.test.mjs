/*
 * PART 9 §16a AN IMPORTER DOES NOT BAKE A DERIVED NAME INTO SOURCE, pinned on
 * the fixture's own bytes (markup-carve/carve#1500).
 *
 * WHY THIS EXISTS BESIDE THE FIXTURE. tests/html-import-contract.check.mjs
 * runs `tests/html-import/derived-accessible-name` through the pinned engine,
 * and while that engine still launders the derived name the fixture sits under
 * a declared PIN_LAG entry. A lagging fixture is compared only for INEQUALITY,
 * so its expectations could be rewritten to say anything at all - including the
 * over-broad rule the clause explicitly does not adopt - and the contract check
 * would stay green, because the engine disagrees with that too.
 *
 * The clause names its own test and it is not a round trip: the assertion has
 * to be that a DERIVED name is ABSENT from the imported source. The untitled
 * admonition is the reason - it round-trips to byte-identical HTML while being
 * permanently unlocalizable, so a round-trip assertion passes with the defect
 * present.
 *
 * So both halves are read off the fixture directly, and they fail in opposite
 * directions: dropping too little leaves the derived value in, and dropping too
 * much takes the authored one with it.
 */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

const fixture = new URL('./html-import/derived-accessible-name/', import.meta.url)
const read = (name) => readFile(new URL(name, fixture), 'utf8')

test('the input carries both a derived name and an authored one', async () => {
  const html = await read('input.html')
  // The derived pair, twice: `role="img"` and the diagram fence's own class
  // word, which Extensions §1.5 keeps out of the labels map precisely because
  // it is derived rather than written.
  assert.equal(html.match(/role="img"/g)?.length, 2)
  assert.equal(html.match(/aria-label="mermaid"/g)?.length, 1)
  // The control: a name no renderer derives for this element.
  assert.match(html, /aria-label="Architecture overview"/)
})

test('a derived name is absent from the imported source and from its AST', async () => {
  const crv = await read('expected.crv')
  const ast = await read('expected.ast.json')
  for (const [what, text] of [
    ['expected.crv', crv],
    ['expected.ast.json', ast],
  ]) {
    assert.doesNotMatch(
      text,
      /aria-label(=|":\s*")"?mermaid/,
      `${what} keeps the accessible name the renderer derives for a diagram ` +
        `fence, so a round trip through it launders a generated string into ` +
        `source and the labels map stops reaching the document ` +
        `(PART 9 §16a, markup-carve/carve#1500).`,
    )
    assert.doesNotMatch(
      text,
      /role(=|":\s*")"?img/,
      `${what} keeps the role the renderer derives for a diagram fence ` +
        `(PART 9 §16a, markup-carve/carve#1500).`,
    )
  }
})

test('a name that differs from the derived one is kept', async () => {
  const crv = await read('expected.crv')
  const ast = await read('expected.ast.json')
  // THE NEAR MISS. Reading the clause as "drop the name on a named construct"
  // rather than as "drop a value equal to the derived one" takes this with it,
  // which is the accessibility regression carve-php#1337 and carve-rs#1060
  // record. The clause says what is NOT ruled here for this reason.
  assert.match(
    crv,
    /aria-label="Architecture overview"/,
    'expected.crv drops an accessible name no renderer derives, which is the ' +
      'blanket drop PART 9 §16a refuses (markup-carve/carve#1500).',
  )
  assert.match(ast, /"aria-label":\s*"Architecture overview"/)
})

test('the drop is not a lossy decision, so the report stays empty', async () => {
  const report = JSON.parse(await read('expected.report.json'))
  assert.deepEqual(
    report.diagnostics,
    [],
    'a value-matched drop loses nothing - the renderer writes the value back - ' +
      'so it emits no attribute-dropped (PART 9 §16a, markup-carve/carve#1500).',
  )
})
