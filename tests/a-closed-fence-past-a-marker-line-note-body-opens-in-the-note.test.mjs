import test from 'node:test'
import assert from 'node:assert/strict'
import { parse, normalizeAuthoredBodyBases } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const F = '`'.repeat(3)
const ref = '<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a>'
const backlink = '<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a>'
const norm = (html) => html.replace(/\s+/g, ' ').replace(/>\s+</g, '><').replace(/\s+(?=<a|<pre)/g, '').trim()
const endnotes = (body) => `<section role="doc-endnotes" aria-label="Footnotes"><hr><ol><li id="fn1">${body}</li></ol></section>`

for (const q of ['', '> ']) {
  const wrap = (body) => q ? `<blockquote>${body}</blockquote>` : body
  const source = (lead, marker, column, closed = true) => [
    `- [^n]: ${lead}`, `    ${marker} child`, `${' '.repeat(column)}${F}`,
    `${' '.repeat(column)}code`, ...(closed ? [`${' '.repeat(column)}${F}`] : []), 'after [^n]',
  ].map((line) => q + line).join('\n') + '\n'

  test(`a closed fence past a marker-line note paragraph opens in the note, quote ${!!q}`, () => {
    for (const marker of ['-', '*', '1.', '1)', '- [ ]', '- [x]']) for (const column of [6, 8]) {
      const src = source('text', marker, column)
      const body = `<p>text ${marker} child</p><pre><code>code </code></pre><p>${backlink}</p>`
      assert.equal(norm(renderDoc(parse(src))), wrap(`<ul><li></li></ul><p>after${ref}</p>`) + endnotes(body), src)
    }
  })

  test(`a closed child fence belongs to the list in a marker-line term note, quote ${!!q}`, () => {
    const body = `<dl><dt>term</dt></dl><ul><li>child<pre><code>code </code></pre></li></ul><p>${backlink}</p>`
    assert.equal(norm(renderDoc(parse(source(':: term', '-', 6)))),
      wrap(`<ul><li></li></ul><p>after${ref}</p>`) + endnotes(body))
  })

  test(`an unclosed fence after a marker-line note keeps the outer item code, quote ${!!q}`, () => {
    const html = renderDoc(parse(source('text', '-', 6, false)))
    const body = `<p>text - child${backlink}</p>`
    assert.equal(norm(html), wrap(`<ul><li><pre><code>code </code></pre></li></ul><p>after${ref}</p>`) + endnotes(body))
  })
}

for (const [boundary, expected] of [
  ['- sibling', '<ul><li><pre><code>code </code></pre></li><li>sibling <code> after [^n]</code></li></ul>'],
  ['outside', '<ul><li><pre><code>code </code></pre></li></ul><p>outside <code> after [^n]</code></p>'],
  ['\n- sibling', '<ul><li><pre><code>code </code></pre></li><li><p>sibling <code> after [^n]</code></p></li></ul>'],
]) {
  test(`a closer beyond the note boundary keeps the first item's code: ${JSON.stringify(boundary)}`, () => {
    const src = `- [^n]: text\n    - child\n      ${F}\n      code\n${boundary}\n      ${F}\nafter [^n]\n`
    assert.equal(norm(renderDoc(parse(src))), expected)
  })
}

for (const [name, head, repeated, check = parse] of [
  ['description unclosed runs', 'text\n', `- child\n  ${F} info\n`, (src) => normalizeAuthoredBodyBases(src.trimEnd().split('\n'))],
  ['note bare runs', '- [^n]: text\n', `    - child\n      ${F}\n`],
]) {
  test(`absorbed markers and fence searches scale linearly in a ${name}`, () => {
    const small = head + repeated.repeat(2000)
    const large = head + repeated.repeat(8000)
    check(small)
    check(large)
    const measure = (src) => {
      const samples = []
      for (let i = 0; i < 5; i++) {
        const start = performance.now()
        check(src)
        samples.push(performance.now() - start)
      }
      return samples.sort((a, b) => a - b)[2]
    }
    const baseline = measure(small)
    const elapsed = measure(large)
    assert.ok(elapsed / baseline < 8, `${name}: 2000=${baseline} ms, 8000=${elapsed} ms`)
  })
}
