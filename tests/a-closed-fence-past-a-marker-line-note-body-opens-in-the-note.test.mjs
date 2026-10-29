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

  test(`a closed child fence belongs to the list in a marker-line term note, quote depth ${q.length / 2}`, () => {
    const body = `<dl><dt>term</dt></dl><ul><li>child<pre><code>code </code></pre></li></ul><p>${backlink}</p>`
    assert.equal(norm(renderDoc(parse(source(':: term', '-', 6)))),
      wrap(`<ul><li></li></ul><p>after${ref}</p>`) + endnotes(body))
  })

  test(`an unclosed fence past a marker-line note body opens in the note, quote depth ${q.length / 2}`, () => {
    for (const marker of ['-', '*', '1.', '1)', '- [ ]', '- [x]']) {
      for (const column of [5, 6, 7, 8]) for (const run of [F, '~~~']) {
        const src = source('text', marker, column, false).replace(F, run)
        // carve#4018: the opener interrupts the note paragraph and `after [^n]` ends the fence.
        const body = `<p>text ${marker} child</p><pre><code>code </code></pre><p>${backlink}</p>`
        assert.equal(norm(renderDoc(parse(src))), wrap(`<ul><li></li></ul><p>after${ref}</p>`) + endnotes(body), src)
      }
    }
  })
}

for (const q of ['', '> ', '> > ']) for (const boundary of ['- sibling', 'outside', '\n- sibling']) {
  test(`the note boundary ends the note fence and the later run opens its own: ${JSON.stringify(boundary)}, quote depth ${q.length / 2}`, () => {
    const lines = ['- [^n]: text', '    - child', `      ${F}`, '      code',
      ...boundary.split('\n'), `      ${F}`, 'after [^n]']
    const src = lines.map(line => q + line).join('\n') + '\n'
    // carve#4018: no closer lookahead; the boundary line ends the unclosed note fence.
    const doc = parse(src)
    let blocks = doc.blocks
    for (let depth = 0; depth < q.length / 2; depth++) blocks = blocks[0].children
    assert.deepEqual(doc.footnoteDefs.get('n').map((block) => block.t), ['para', 'code'], src)
    assert.match(doc.footnoteDefs.get('n')[1].text, /^code\n/, src)
    if (boundary === 'outside') {
      assert.deepEqual(blocks[1], { t: 'para', lines: ['outside'] }, src)
      assert.equal(blocks[2].t, 'code', src)
      assert.match(blocks[2].text, /^after \[\^n\]\n/, src)
    } else {
      assert.deepEqual(blocks[0].items[1].blocks.map((block) => block.t), ['para', 'code'], src)
      assert.deepEqual(blocks[1], { t: 'para', lines: ['after [^n]'] }, src)
    }
  })
}

// Under rule A the first row is one paragraph, so it runs no closer search; its
// cost is the line walk plus the caption-host check on the growing paragraph (carve#3892).
const forwardSearch = () => layoutWork.forwardSearch
for (const [name, head, repeated, check = parse, counter = forwardSearch] of [
  ['description unclosed runs', 'text\n', `- child\n  ${F} info\n`, parse, () => layoutWork.lineVisits + layoutWork.captionHost],
  ['note bare runs', '- [^n]: text\n', `    - child\n      ${F}\n`],
]) {
  test(`absorbed markers and fence searches scale linearly in a ${name}`, () => {
    const small = head + repeated.repeat(2000)
    const large = head + repeated.repeat(8000)
    const work = (src) => {
      resetLayoutWork()
      check(src)
      return counter()
    }
    const baseline = work(small)
    const scaled = work(large)
    assert.ok(baseline > 0, `${name}: the closer search never ran`)
    assert.ok(scaled / baseline < 6, `${name}: 2000=${baseline} steps, 8000=${scaled} steps`)
  })
}
