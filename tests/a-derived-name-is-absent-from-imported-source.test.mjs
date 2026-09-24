/*
 * PART 9 §16a: imported source does not keep a derived name
 * (markup-carve/carve#1500).
 *
 * tests/html-import-contract.check.mjs compares the fixture with the pinned
 * engine. If both were wrong in the same way, that check would still pass.
 * This test checks the rule against the fixture itself.
 *
 * The assertion checks that the derived name is absent from imported source.
 * An untitled admonition can round-trip to identical HTML while still carrying
 * an unlocalizable generated name, so an HTML round-trip would miss this defect.
 *
 * The test also checks that an authored name remains in the fixture.
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
