import test from 'node:test'
import assert from 'node:assert/strict'
import { parse, layoutWork, resetLayoutWork } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const F = '`'.repeat(3)
const ref = '<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a>'
const backlink = '<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a>'
const norm = (html) => html.replace(/\s+/g, ' ').replace(/>\s+</g, '><').replace(/\s+(?=<a|<pre)/g, '').trim()
const endnotes = (body) => `<section role="doc-endnotes" aria-label="Footnotes"><hr><ol><li id="fn1">${body}</li></ol></section>`

for (const q of ['', '> ', '> > ']) {
  const wrap = (body) => q === '' ? body : q === '> '
    ? `<blockquote>${body}</blockquote>` : `<blockquote><blockquote>${body}</blockquote></blockquote>`
  const source = (lead, marker, column, closed = true) => [
    `- [^n]: ${lead}`, `    ${marker} child`, `${' '.repeat(column)}${F}`,
    `${' '.repeat(column)}code`, ...(closed ? [`${' '.repeat(column)}${F}`] : []), 'after [^n]',
  ].map((line) => q + line).join('\n') + '\n'

  test(`a closed fence past a marker-line note paragraph opens in the note, quote depth ${q.length / 2}`, () => {
    for (const marker of ['-', '*', '1.', '1)', '- [ ]', '- [x]']) for (const column of [6, 8]) {
      const src = source('text', marker, column)
      const body = `<p>text ${marker} child</p><pre><code>code </code></pre><p>${backlink}</p>`
      assert.equal(norm(renderDoc(parse(src))), wrap(`<ul><li></li></ul><p>after${ref}</p>`) + endnotes(body), src)
    }
  })

  test(`a closed child fence belongs to the list in a marker-line term note, quote depth ${q.length / 2}`, { todo: 'markup-carve/carve#3892' }, () => {
    const body = `<dl><dt>term</dt></dl><ul><li>child<pre><code>code </code></pre></li></ul><p>${backlink}</p>`
    assert.equal(norm(renderDoc(parse(source(':: term', '-', 6)))),
      wrap(`<ul><li></li></ul><p>after${ref}</p>`) + endnotes(body))
  })

  test(`an unclosed fence past a marker-line note body stays note text, quote depth ${q.length / 2}`, () => {
    for (const marker of ['-', '*', '1.', '1)', '- [ ]', '- [x]']) {
      for (const column of [5, 6, 7, 8]) for (const run of [F, '~~~']) {
        const src = source('text', marker, column, false).replace(F, run)
        // Keep the inline reading with a single backtick or an escaped tilde run.
        const twin = src.replace(run, run === F ? '`' : '\\~~~')
        assert.equal(renderDoc(parse(src)), renderDoc(parse(twin)), src)
      }
    }
    const body = `<p>text - child <code> code</code>${backlink}</p>`
    assert.equal(norm(renderDoc(parse(source('text', '-', 6, false)))),
      wrap(`<ul><li></li></ul><p>after${ref}</p>`) + endnotes(body))
  })
}

for (const q of ['', '> ', '> > ']) for (const boundary of ['- sibling', 'outside', '\n- sibling']) {
  test(`a closer beyond the note boundary leaves the run as note text: ${JSON.stringify(boundary)}, quote depth ${q.length / 2}`, () => {
    const lines = ['- [^n]: text', '    - child', `      ${F}`, '      code',
      ...boundary.split('\n'), `      ${F}`, 'after [^n]']
    const src = lines.map(line => q + line).join('\n') + '\n'
    const twin = lines.map((line, index) => q + (index === 2 ? '      `' : line)).join('\n') + '\n'
    assert.equal(renderDoc(parse(src)), renderDoc(parse(twin)), src)
  })
}

for (const [name, head, repeated, check = parse] of [
  ['description unclosed runs', 'text\n', `- child\n  ${F} info\n`],
  ['note bare runs', '- [^n]: text\n', `    - child\n      ${F}\n`],
]) {
  test(`absorbed markers and fence searches scale linearly in a ${name}`, { todo: name === 'description unclosed runs' && 'markup-carve/carve#3892' }, () => {
    const small = head + repeated.repeat(2000)
    const large = head + repeated.repeat(8000)
    const work = (src) => {
      resetLayoutWork()
      check(src)
      return layoutWork.forwardSearch
    }
    const baseline = work(small)
    const scaled = work(large)
    assert.ok(baseline > 0, `${name}: the closer search never ran`)
    assert.ok(scaled / baseline < 6, `${name}: 2000=${baseline} steps, 8000=${scaled} steps`)
  })
}
