/*
 * PART 9 §16's CARVE-P9-073 (carve#2274), read AND run.
 *
 * The clause half keeps the ruling in the grammar: the container set, the floor
 * it degrades to, where the section goes instead, and the lint rule id are each
 * asserted separately, because losing any one of them leaves a rule that reads
 * complete and answers a different question.
 *
 * The behavior half runs the executable spec, which is the oracle the corpus is
 * checked against. Corpus row 497 pins the block quote; the list item and the
 * footnote definition are here instead of as four more corpus rows, and the
 * top-level marker and the unmarked document are the controls that fail if the
 * refusal is written too wide.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { carveToHtml, citations, tocPlacement } from '@markup-carve/carve'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const grammar = readFileSync(resolve(root, 'resources/grammar.ebnf'), 'utf8')
const oracleHtml = (source) => renderDoc(parse(source)).trim()

function clause() {
  const start = grammar.indexOf('DOCUMENT-WIDE PLACEMENT MARKERS REQUIRE DOCUMENT TOP LEVEL')
  assert.notEqual(start, -1, 'CARVE-P9-073 is gone from the grammar')
  const rest = grammar.slice(start)
  const end = rest.indexOf('- BACKLINK PLACEMENT WHEN THE BODY DOES NOT END IN A PARAGRAPH')
  assert.notEqual(end, -1, 'CARVE-P9-073 no longer sits above the backlink-placement bullet')
  return rest.slice(0, end)
}

test('the clause carries its id and refuses the nested placement', () => {
  const body = clause()
  assert.match(body, /\[CARVE-P9-073\]/)
  assert.match(body, /does not place/)
  for (const kind of ['footnotes', 'bibliography', 'references']) {
    assert.match(body, new RegExp('`::: ' + kind + '`'))
  }
  for (const kind of ['toc', 'glossary', 'index']) {
    assert.match(body, new RegExp('does not restrict[^.]*`::: ' + kind + '`'))
  }
})

test('the clause names every container, not only the block quote', () => {
  const body = clause()
  for (const container of [
    'block quote',
    'list item',
    'div or directive body',
    'table cell',
    'definition description',
    'footnote definition',
  ]) assert.match(body, new RegExp(container.replace(/ /g, '\\s+')), container)
})

test('the clause names the floor and where the section goes instead', () => {
  const body = clause()
  assert.match(body, /`<div class="\{kind\}">` floor/)
  assert.match(body, /goes where it would without THIS marker/)
  // NOT "where an unmarked document puts it": a document carrying a contained
  // marker AND a top-level one places the section at the top-level marker, so
  // the document is not unmarked and the refusal does not send it to the end
  // (carve-php#2404 has the case; carve#2298 corrected the same claim in
  // docs/validation.md).
  assert.doesNotMatch(body, /unmarked document/)
})

test('the clause names the diagnostic a refused marker reports', () => {
  const body = clause()
  assert.match(body, /lint\s+diagnostics/)
  assert.match(body, /`\{kind\}-placement-in-container`/)
  const validation = readFileSync(resolve(root, 'docs/validation.md'), 'utf8')
  for (const kind of ['footnotes', 'bibliography', 'references']) {
    assert.match(validation, new RegExp('\\| `' + kind + '-placement-in-container` \\|'))
  }
})

test('a marker inside a container renders the floor and the section at the end', () => {
  for (const [name, source] of [
    ['block quote', 'a[^1]\n\n> ::: footnotes\n> :::\n\n[^1]: body\n'],
    ['list item', 'a[^1]\n\n- ::: footnotes\n  :::\n\n[^1]: body\n'],
  ]) {
    const html = oracleHtml(source)
    assert.match(html, /<div class="footnotes">/, name)
    // The floor is where the marker was written and the section is after every
    // block, so the section cannot be the earlier of the two.
    assert.ok(
      html.indexOf('<div class="footnotes">') < html.indexOf('<section role="doc-endnotes"'),
      `${name}: the section did not follow the floor`,
    )
    assert.ok(html.trimEnd().endsWith('</section>'), `${name}: the section is not last`)
  }

  // A footnote definition is the one container the ordering reverses in: its
  // body IS the section's content, so the floor renders inside the very section
  // the marker failed to move. It must still be the floor and not a placement.
  const inNote = oracleHtml('a[^1]\n\n[^1]: body\n\n  ::: footnotes\n  :::\n')
  assert.match(inNote, /<li id="fn1">[\s\S]*<div class="footnotes">[\s\S]*<\/li>/)
  assert.equal(inNote.match(/<section role="doc-endnotes"/g).length, 1)
})

test('a top-level marker still places and an unmarked document is unchanged', () => {
  const placed = oracleHtml('a[^1]\n\n::: footnotes\n:::\n\n## After\n\nmore\n\n[^1]: body\n')
  assert.doesNotMatch(placed, /<div class="footnotes">/)
  // The index comparison below is read BEFORE it is used: a missing section
  // indexes at -1, which precedes every real offset and would read as placed.
  assert.match(placed, /<section role="doc-endnotes"/)
  // Placed means BEFORE the heading section that follows it, which is the only
  // thing that tells placement apart from the default append.
  assert.ok(
    placed.indexOf('<section role="doc-endnotes"') < placed.indexOf('<section id="After">'),
    'a top-level marker stopped placing',
  )

  const unmarked = oracleHtml('a[^1]\n\n[^1]: body\n')
  assert.doesNotMatch(unmarked, /<div class="footnotes">/)
  assert.match(unmarked, /<section role="doc-endnotes"/)
  assert.ok(unmarked.trimEnd().endsWith('</section>'))
})

test('a placed footnotes title and label name the section after authored blocks', () => {
  const source = 'a[^1]\n\n::: footnotes "Notes" [End]\nAuthored.\n:::\n\n[^1]: body\n'
  const html = oracleHtml(source)
  const body = html.indexOf('<p>Authored.</p>')
  const section = html.indexOf('<section role="doc-endnotes" aria-labelledby="adm-1">')
  const title = html.indexOf('<p class="admonition-title" id="adm-1">Notes</p>')
  const label = html.indexOf('<p class="div-label">End</p>')
  const rule = html.indexOf('  <hr>')
  assert.ok(body >= 0 && section > body && title > section && label > title && rule > label)
  assert.equal(html, carveToHtml(source).trim())
})

test('an unplaced footnotes title keeps its div floor and consumes no adm id', () => {
  const source = '::: footnotes "Notes" [End]\nAuthored.\n:::\n\n::: note "Next"\nBody.\n:::\n'
  const html = oracleHtml(source)
  assert.match(html, /<div class="footnotes">\n  <p class="admonition-title">Notes<\/p>\n  <p class="div-label">End<\/p>\n  <p>Authored\.<\/p>\n<\/div>/)
  assert.match(html, /<aside class="admonition note" aria-labelledby="adm-1">/)
  assert.equal(html, carveToHtml(source).trim())
})

test('a placed title takes its adm id before titles inside its body', () => {
  const source = 'a[^1]\n\n::: footnotes "Notes" [End]\n::: note "Inside"\nBody.\n:::\n:::\n\n[^1]: body\n'
  const html = oracleHtml(source)
  assert.match(html, /<section role="doc-endnotes" aria-labelledby="adm-1">\n  <p class="admonition-title" id="adm-1">Notes<\/p>/)
  assert.match(html, /<aside class="admonition note" aria-labelledby="adm-2">/)
  assert.equal(html, carveToHtml(source).trim())
})

test('a titled marker inside a heading section keeps endnotes indentation', () => {
  const source = '# Heading\n\na[^1].\n\n::: footnotes "Notes" [End]\nAuthored.\n:::\n\n[^1]: body\n'
  assert.equal(oracleHtml(source), carveToHtml(source).trim())
})

test('a nested references marker leaves a later top-level marker available', () => {
  const source = 'See [@x].\n\n> ::: references\n> :::\n\n::: references\n:::\n\n## After\n\n[@x]: Source\n'
  const html = carveToHtml(source, { extensions: [citations()] })
  const floor = html.indexOf('<blockquote>\n  <div class="references">')
  const list = html.indexOf('<ol class="references">')
  const heading = html.indexOf('<section id="After">')
  assert.ok(floor >= 0 && list > floor && heading > list)
  assert.equal(html.match(/<ol class="references">/g)?.length, 1)
})

test("a placed title follows the authored body inside the endnotes section", () => {
  const source = `::: footnotes "Notes"
First body.

Second body.
:::

Text[^a].

[^a]: Note.`
  const expected = `<p>First body.</p>
<p>Second body.</p>
<section role="doc-endnotes" aria-labelledby="adm-1">
  <p class="admonition-title" id="adm-1">Notes</p>
  <hr>
  <ol>
    <li id="fn1">
      <p>Note.<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
<p>Text<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a>.</p>`
  assert.equal(carveToHtml(source).trim(), expected)
})

test("a marker with no notes keeps its body in the fallback div", () => {
  const source = `::: footnotes
Only body.
:::`
  const expected = `<div class="footnotes">
  <p>Only body.</p>
</div>`
  assert.equal(carveToHtml(source).trim(), expected)
})

test("a second marker keeps its body in the fallback div", () => {
  const source = `::: footnotes
First body.
:::

::: footnotes
Second body.
:::

Text[^a].

[^a]: Note.`
  const expected = `<p>First body.</p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>Note.<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
<div class="footnotes">
  <p>Second body.</p>
</div>
<p>Text<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a>.</p>`
  assert.equal(carveToHtml(source).trim(), expected)
})

test("a nested marker keeps its attributes and body in the fallback div", () => {
  const source = `> {#x k=v}
> ::: footnotes
> Body.
> :::

Text[^a].

[^a]: Note.`
  const expected = `<blockquote>
  <div class="footnotes" id="x" k="v">
    <p>Body.</p>
  </div>
</blockquote>
<p>Text<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a>.</p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>Note.<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>`
  assert.equal(carveToHtml(source).trim(), expected)
  assert.equal(oracleHtml(source).trim(), expected)
})

test("a nested TOC marker leaves a later top-level footnotes marker available", () => {
  const source = `::::: toc "Outer"
::: footnotes
:::
:::::

::: footnotes
Placed body.
:::

# H

Text[^a] more.

[^a]: The note.`
  const expected = `<div class="footnotes">

</div>
<nav class="toc" aria-labelledby="adm-1">
<p class="admonition-title" id="adm-1">Outer</p>
<ul>
<li><a href="#H">H</a></li>
</ul>
</nav>
<p>Placed body.</p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>The note.<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
<section id="H">
  <h1>H</h1>
  <p>Text<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a> more.</p>
</section>`
  assert.equal(carveToHtml(source, { extensions: [tocPlacement()] }).trim(), expected)
})

test('a references body precedes its placed citation list inside the wrapper', () => {
  const source = '::: references\nAuthored.\n:::\n\n# H\n\nSee [@x].\n\n[@x]: Source\n'
  const html = carveToHtml(source, { extensions: [citations()] })
  assert.ok(html.startsWith('<div class="references">\n  <p>Authored.</p>\n  <ol class="references">'))
  assert.ok(html.indexOf('</ol>') < html.indexOf('<section id="H">'))
})

for (const kind of ['references', 'bibliography']) {
  test(`a ${kind} marker in a TOC body retains its container scope`, () => {
    const tail = '# H\n\nSee [@x].\n\n[@x]: Source\n'
    const source = `::::: toc "Contents"\n::: ${kind}\nAuthored.\n:::\n:::::\n\n${tail}`
    const html = carveToHtml(source, { extensions: [citations(), tocPlacement()] })
    assert.ok(html.startsWith(`<div class="${kind}">\n  <p>Authored.</p>\n</div>\n<nav`))
    const heading = html.indexOf('<section id="H">')
    const list = html.indexOf('<ol class="references">')
    assert.ok(heading >= 0 && list > heading)
    assert.equal(html.slice(heading), carveToHtml(tail, { extensions: [citations()] }))
  })
}

test('an unplaced top-level marker retains its authored attributes', () => {
  for (const title of ['', ' "Notes"']) {
    const source = `{#x k=v}\n::: footnotes${title}\nBody.\n:::\n`
    const html = carveToHtml(source).trim()
    assert.ok(html.startsWith('<div class="footnotes" id="x" k="v">'))
    assert.equal(oracleHtml(source).trim(), html)
  }
})
