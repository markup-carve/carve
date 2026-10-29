import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const render = (source) => renderDoc(parse(source))
const norm = (html) => html.replace(/\s+/g, ' ').replace(/>\s+</g, '><').trim()
const ref = '<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a>'
const back = '<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a>'
const notes = (body) => `<section role="doc-endnotes" aria-label="Footnotes"><hr><ol><li id="fn1">${body}</li></ol></section>`
const quote = (html, depth) => '<blockquote>'.repeat(depth) + html + '</blockquote>'.repeat(depth)
const source = (marker, column, run, depth, { blank = false, child = '', closed = true, nested = false, lead = 'text' } = {}) => {
  const prefix = '> '.repeat(depth)
  const head = nested ? ['- x', `  ${marker} [^n]: ${lead}`] : [`${marker} [^n]: ${lead}`]
  return [...head, ...(blank ? [''] : []), ...(child ? [child] : []),
    `${' '.repeat(column)}${run}`, `${' '.repeat(column)}code`,
    ...(closed ? [`${' '.repeat(column)}${run}`] : []), 'after [^n]']
    .map(line => prefix + line).join('\n') + '\n'
}

test('the body-column fence interrupts the marker-line note paragraph', () => {
  const expected = quote('<ul><li></li></ul><p>after ' + ref + '</p>', 0) +
    notes('<p>text</p><pre><code>code </code></pre><p>' + back + '</p>')
  assert.equal(norm(render(source('-', 4, '```', 0))), expected)
  assert.equal(norm(render(source('-', 4, '```', 0, { blank: true }))), expected)
})

test('the absorbed child and column-five fence remain in the note', () => {
  const actual = source('-', 5, '```', 0, { lead: '%% c', child: '    - child' })
  assert.equal(norm(render(actual)), '<ul><li></li></ul><p>after ' + ref + '</p>' +
    notes('<ul><li>child</li></ul><pre><code>code </code></pre><p>' + back + '</p>'))
})

test('a column-three fence stays in the outer item', () => {
  assert.equal(norm(render(source('-', 3, '```', 0))),
    '<ul><li><pre><code>code </code></pre></li></ul><p>after ' + ref + '</p>' +
    notes('<p>text' + back + '</p>'))
})

for (const depth of [0, 1, 2]) for (const marker of ['-', '*', '1.', '1)', '- [ ]', '- [x]']) {
  for (const run of ['```', '~~~']) test(`note fence ownership: ${marker}, ${run}, quote depth ${depth}`, () => {
    const body = marker.length + 3
    for (const offset of [0, 1]) for (const blank of [false, true]) {
      const src = source(marker, body + offset, run, depth, { blank })
      const html = norm(render(src))
      assert.match(html, /<li id="fn1"><p>text<\/p><pre><code>code /, src)
      assert.doesNotMatch(html.slice(0, html.indexOf('<section')), /<pre>/, src)
    }
    for (const column of [body - 2, body - 1]) {
      const src = source(marker, column, run, depth)
      const html = render(src)
      assert.doesNotMatch(html.slice(html.indexOf('<li id="fn1">')), /<pre>/, src)
    }
    // Without a closer the fence still opens, and the column-zero line ends it (carve#4018).
    const unclosed = source(marker, body, run, depth, { closed: false })
    assert.equal(render(unclosed), render(source(marker, body, run, depth)), unclosed)
  })
}

test('a nested marker-line note owns its body-column fence', () => {
  for (const run of ['```', '~~~']) {
    const html = render(source('-', 6, run, 0, { nested: true }))
    assert.match(html, /<li id="fn1">\s*<p>text<\/p>\s*<pre><code>code\n/)
  }
})

test('a fence at a child content column stays with the child', () => {
  const html = render(source('-', 6, '```', 0, { lead: '%% c', child: '    - child' }))
  assert.match(html, /<li>child\s*<pre><code>code\n/)
})

test('a fence below the body column stays outside after an absorbed child', () => {
  for (const column of [2, 3]) {
    const html = render(source('-', column, '```', 0, { lead: '%% c', child: '    - child' }))
    assert.doesNotMatch(html.slice(html.indexOf('<li id="fn1">')), /<pre>/)
  }
})

// Without a blank, item prose below the note body column is a lazy line of
// the note (carve#3885), and the fence follows it there.
test('item prose below the note body column ends the note extent after a blank', () => {
  const html = render('- [^n]: text\n\n  item para\n\n    ```\n    code\n    ```\nafter [^n]\n')
  assert.match(html.slice(0, html.indexOf('<section')), /<li>[\s\S]*<pre><code>code\n/)
  assert.doesNotMatch(html.slice(html.indexOf('<li id="fn1">')), /<pre>/)
  const lazy = render('- [^n]: text\n  item para\n\n    ```\n    code\n    ```\nafter [^n]\n')
  assert.match(lazy.slice(lazy.indexOf('<li id="fn1">')), /<p>text\nitem para<\/p>\n      <pre><code>code\n/)
})

test('a term at the note body column opens in the note, and a later fence follows it', () => {
  const expectedItem = '<ul><li></li></ul><p>after ' + ref + '</p>'
  const expectedNote = notes('<p>text more</p><dl><dt>t</dt></dl><pre><code>code </code></pre><p>' + back + '</p>')
  for (const run of ['```', '~~~']) for (const depth of [0, 1]) {
    const lines = ['- [^n]: text', '    more', '    :: t', `    ${run}`, '    code', `    ${run}`, 'after [^n]']
    const src = lines.map(line => '> '.repeat(depth) + line).join('\n') + '\n'
    assert.equal(norm(render(src)), quote(expectedItem, depth) + expectedNote, src)
  }
})

test('an absorbed comment leaves the note eligible for a later fence', () => {
  const src = '- [^n]: text\n    %% c\n    ```\n    code\n    ```\nafter [^n]\n'
  const html = norm(render(src))
  assert.match(html, /<li id="fn1"><p>text<\/p><pre><code>code <\/code><\/pre>/)
  assert.doesNotMatch(html.slice(0, html.indexOf('<section')), /<pre>/)
})

test('an opener-shaped fence payload leaves the note eligible for another fence', () => {
  for (const payload of ['> q', ':: t']) {
    const src = `- [^n]: text\n    \`\`\`\n    ${payload}\n    \`\`\`\n    \`\`\`\n    code2\n    \`\`\`\nafter [^n]\n`
    const html = norm(render(src))
    assert.match(html, /<li id="fn1"><p>text<\/p><pre><code>/)
    assert.match(html.slice(html.indexOf('<li id="fn1">')), /<pre><code>code2 <\/code><\/pre>/)
    assert.doesNotMatch(html.slice(0, html.indexOf('<section')), /<pre>/)
  }
})
