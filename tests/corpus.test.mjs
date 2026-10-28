/*
 * Spec-corpus conformance test.
 *
 * Pairs every tests/corpus/NN-slug.crv with its NN-slug.html, feeds the .crv
 * through the EXECUTABLE SPEC (scripts/spec: the layout automaton plus the
 * PART 9R/PART 10 renderer, driven by resources/carve-core.ohm), and asserts a
 * byte-identical match against the .html (after trimming).
 *
 * The oracle is deliberately the executable spec and NOT an engine build. The
 * corpus states what the spec requires, so the spec repo must be able to prove
 * its own fixtures are self-consistent without waiting for an implementation to
 * ship the rule. Each engine verifies ITSELF against this corpus through its own
 * `spec` / `tests/spec` submodule, which is where an engine-versus-corpus
 * disagreement belongs.
 *
 * Inputs listed in scripts/spec/refused-allow.mjs are deliberately outside the
 * executable subset and are skipped here; the refusal ratchet in
 * `npm run core:check` is what keeps that list honest in both directions.
 *
 * The corpus is generated from resources/examples/{core,extensions,edge-cases}.md by
 * `npm run corpus:build`; CI regenerates it first, so a mismatch here means the
 * examples drifted from the committed corpus or the spec changed.
 *
 * Uses the Node built-in test runner (node:test) so the docs site needs no
 * extra test dependency.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { resolve, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse, Refuse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'
import { REFUSED_ALLOW } from '../scripts/spec/refused-allow.mjs'

const oracleHtml = (source) => renderDoc(parse(source)).trim()

const emptyDestinationCases = JSON.parse(readFileSync(resolve('resources/spec/empty-destination-cases.json'), 'utf8'))
for (const entry of emptyDestinationCases.cases.filter((item) => item.html)) {
  test(`empty destination: ${entry.id}`, () => {
    assert.equal(oracleHtml(entry.source), entry.html)
  })
}
for (const entry of emptyDestinationCases.cases.filter((item) => Object.hasOwn(item, 'definition'))) {
  test(`empty destination definition: ${entry.id}`, () => {
    const definitions = [...parse(entry.source).linkDefs.values()]
    if (entry.definition === null) {
      assert.equal(definitions.length, 0)
    } else {
      assert.ok(definitions.some((def) => def.rawLabel === entry.definition.label && def.url === entry.definition.href))
    }
  })
}
for (const entry of emptyDestinationCases.cases.filter((item) => item.kind && !item.html)) {
  test(`empty destination shape: ${entry.id}`, () => {
    const rendered = oracleHtml(entry.source)
    if (entry.kind === 'link') assert.match(rendered, /<a href=/)
    else if (entry.kind === 'image') assert.match(rendered, /<img src=/)
    else {
      assert.doesNotMatch(rendered, /<a href=|<img src=/)
    }
  })
}

test('a nonzero below-column comment closes the item', () => {
  assert.equal(oracleHtml('- intro\n  %% a\n %% b\n  tail\n'),
    '<ul>\n  <li>intro</li>\n</ul>\n<p>tail</p>')
})

test('over-column list block groups match their exact-column spelling', () => {
  for (const [name, exact, over] of [
    ['heading', '  # h', '     # h'],
    ['definition list', '  :: term\n  more\n  :  def', '     :: term\n     more\n     :  def'],
    ['table caption', '  | a |\n  |---|\n  | 1 |\n  ^ cap', '     | a |\n     |---|\n     | 1 |\n     ^ cap'],
    ['image caption', '  ![a](u)\n  ^ cap', '     ![a](u)\n     ^ cap'],
    ['code caption', '  ```\n  code\n  ```\n  ^ cap', '     ```\n     code\n     ```\n     ^ cap'],
  ]) assert.equal(oracleHtml(`- item\n\n${over}\n`), oracleHtml(`- item\n\n${exact}\n`), name)
})

test('authored list bases preserve exact looseness, ownership, and fence payload', () => {
  const exactImage = oracleHtml('- item\n\n  ![a](u)\n')
  assert.equal(oracleHtml('- item\n\n   ![a](u)\n'), exactImage)
  assert.match(exactImage, /<li><p>item<\/p>/)
  assert.match(oracleHtml('- - a\n\n    # child\n'), /<li>a\s*<h1/)
  assert.match(oracleHtml('- - a\n\n   # parent\n'), /<\/ul>\s*<h1 id="parent">/)
  const exactFence = '- item\n\n  ```\n  a\n\n   b\n  ```\n'
  const overFence = '- item\n\n     ```\n     a\n\n   b\n     ```\n'
  assert.match(oracleHtml(exactFence), /<pre><code>a\n\n b\n<\/code><\/pre>/)
  assert.match(oracleHtml(overFence), /<pre><code>a\n\nb\n<\/code><\/pre>/)
})

const here = dirname(fileURLToPath(import.meta.url))
const corpusDir = resolve(here, 'corpus')

if (!existsSync(corpusDir)) {
  throw new Error(`Spec corpus not found at ${corpusDir}.`)
}

const slugs = readdirSync(corpusDir)
  .filter((f) => f.endsWith('.crv'))
  .map((f) => basename(f, '.crv'))
  .sort()

if (slugs.length === 0) {
  throw new Error(
    `No .crv fixtures in ${corpusDir}. Run \`npm run corpus:build\` first.`,
  )
}

for (const slug of slugs) {
  test(slug, { skip: REFUSED_ALLOW.has(slug) ? 'deliberately out of the executable subset' : false }, () => {
    const crv = readFileSync(resolve(corpusDir, `${slug}.crv`), 'utf8')
    const htmlPath = resolve(corpusDir, `${slug}.html`)
    assert.ok(existsSync(htmlPath), `missing ${slug}.html pair`)
    const expected = readFileSync(htmlPath, 'utf8')
    let got
    try {
      got = renderDoc(parse(crv))
    } catch (e) {
      if (e instanceof Refuse || e.refuse) {
        assert.fail(
          `the executable spec refused this input: ${e.message}\n` +
            `Cover it in scripts/spec, or add "${slug}" to scripts/spec/refused-allow.mjs deliberately.`,
        )
      }
      throw e
    }
    assert.equal(got.trim(), expected.trim())
  })
}

test('the final header count controls a marked CSV table', () => {
  const source = '{header-rows=1}\n{table header-rows=0}\n```csv\na\nb\n```\n'
  assert.doesNotMatch(oracleHtml(source), /<thead>/)
  assert.match(oracleHtml(source), /<td>a<\/td>/)
  assert.doesNotMatch(oracleHtml('{table table}\n```csv\na\n```\n'), /table=""/)
})

test('invalid row counts use the delimited table defaults', () => {
  for (const key of ['header-rows', 'footer-rows']) {
    const source = `{table ${key}=x}\n\`\`\`csv\na,b\n1,2\n\`\`\`\n`
    assert.match(oracleHtml(source), /<thead>/)
    assert.match(oracleHtml(source), /<th scope="col">a<\/th>/)
  }
})
