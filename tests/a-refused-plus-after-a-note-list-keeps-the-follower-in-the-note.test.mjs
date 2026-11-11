import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

// carve#5890 (ruled B): after a refused `+` ends a note's attached list, a line
// at the note's body column belongs to the note and opens a new block there.
const notes = (html) => html.slice(html.indexOf('<li id="fn1">'))
const owner = (source, line) => {
  const trace = []
  parse(source, { trace })
  return trace.find((r) => r.line === line).owner
}

test('a marker after a refused plus opens a second list in a stacked note', () => {
  const source = '- [^a]: +\n  - li\n    ```\n  +\n    - x\n\nsee[^a]\n'
  assert.equal(owner(source, 5), 'doc/item:1/footnote:1/item:5')
  assert.equal(renderDoc(parse(source)), [
    '<ul>',
    '  <li></li>',
    '</ul>',
    '<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>',
    '<section role="doc-endnotes" aria-label="Footnotes">',
    '  <hr>',
    '  <ol>',
    '    <li id="fn1">',
    '      <ul>',
    '        <li>li',
    '          <pre><code></code></pre>',
    '        </li>',
    '      </ul>',
    '      <ul>',
    '        <li>x</li>',
    '      </ul>',
    '      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>',
    '    </li>',
    '  </ol>',
    '</section>',
  ].join('\n'))
})

test('a stacked note keeps the content follower of a refused plus (table R02)', () => {
  const source = 'see[^a]\n\n- [^a]: +\n  a\n  +\n    zq\n'
  assert.equal(owner(source, 6), 'doc/item:3/footnote:3')
  assert.match(notes(renderDoc(parse(source))), /<p>a<\/p>\n {6}<p>zq<a /)
})

test('the follower leaves the ended list item at every note host', () => {
  for (const [source, line, path] of [
    ['[^a]: +\n- li\n  ```\n+\n  - x\n\nsee[^a]\n', 5, 'doc/footnote:1/item:5'],
    ['[^a]: +\n- li\n+\n  - x\n\nsee[^a]\n', 4, 'doc/footnote:1/item:4'],
    ['- [^a]: +\n  - li\n  +\n    - x\n\nsee[^a]\n', 4, 'doc/item:1/footnote:1/item:4'],
    ['- h\n  [^a]: +\n  - li\n  +\n    - x\n\nsee[^a]\n', 5, 'doc/item:1/footnote:2/item:5'],
  ]) {
    assert.equal(owner(source, line), path, source)
    assert.match(notes(renderDoc(parse(source))), /<\/ul>\n {6}<ul>\n {8}<li>x<\/li>/, source)
  }
  const paragraph = '[^a]: +\n- li\n+\n  p\n\nsee[^a]\n'
  assert.equal(owner(paragraph, 4), 'doc/footnote:1')
  assert.match(notes(renderDoc(parse(paragraph))), /<li>li<\/li>\n {6}<\/ul>\n {6}<p>p<a /)
})

test('a blank after the refused plus keeps the follower in a note with a body (table F02)', () => {
  const source = '- [^a]: +\n  - li\n    ~~~\n  +\n\n    zq\n\nsee[^a]\n'
  assert.equal(owner(source, 6), 'doc/item:1/footnote:1')
  const html = renderDoc(parse(source))
  assert.ok(!html.startsWith('<ul>\n  <li>zq'), html)
  assert.match(notes(html), /<p>zq<a /)
})

test('an empty marker-line note still returns the next block to its item (carve#5515)', () => {
  const source = '- h\n  [^a]: +\n  +\n\n    > q\n'
  assert.equal(owner(source, 5), 'doc/item:1/quote:5')
})

// The trace and the HTML name the same owner for the follower: the attached
// block, the note, or outside the note.
const TOKEN = 'zq'
const HOSTS = {
  doc: { open: ['[^a]: +'], pad: '', body: '  ' },
  stacked: { open: ['- [^a]: +'], pad: '  ', body: '    ' },
  item: { open: ['- h', '  [^a]: +'], pad: '  ', body: '    ' },
  quote: { open: ['> [^a]: +'], pad: '> ', body: '>   ' },
  colon: { open: [':::', '[^a]: +'], pad: '', body: '  ', close: [':::'] },
}
const BLOCKS = {
  bullet: ['- li'], twoItems: ['- li', '- lj'], nested: ['- li', '  - n'], ordered: ['1. li'],
  fence: ['- li', '  ```'], tilde: ['- li', '  ~~~'], closed: ['- li', '  ```', '  a', '  ```'],
  task: ['- [ ] li'], para: ['a'], code: ['```', 'a'], closedCode: ['```', 'a', '```'], table: ['| a |'],
}
const FOLLOWERS = {
  item: (p) => [p + '- ' + TOKEN], para: (p) => [p + TOKEN], quote: (p) => [p + '> ' + TOKEN],
  ordered: (p) => [p + '1. ' + TOKEN], star: (p) => [p + '* ' + TOKEN], heading: (p) => [p + '# ' + TOKEN],
  twoLines: (p) => [p + TOKEN, p + 'zz'], deep: (p) => [p + '  - ' + TOKEN],
}

function htmlOwner(html, block) {
  const at = html.indexOf(TOKEN)
  const stack = []
  for (const m of html.slice(0, at).matchAll(/<(\/?)([a-z0-9]+)([^>]*)>/g)) {
    const [, close, tag, attrs] = m
    if (['hr', 'br', 'input', 'img'].includes(tag)) continue
    if (close) {
      const k = stack.findLastIndex((s) => s.tag === tag)
      if (k >= 0) stack.splice(k)
    } else stack.push({ tag, attrs, end: m.index + m[0].length })
  }
  const fn = stack.findIndex((s) => s.tag === 'li' && /id="fn/.test(s.attrs))
  if (fn < 0) return 'outside'
  const own = { pre: /fence|tilde|closed|code/i.test(block), table: block === 'table' }
  const inBlock = stack.slice(fn + 1).some((s) => own[s.tag] ||
    (s.tag === 'li' && /^\s*(<p>)?(<input[^>]*>\s*)?(li|lj|n)\b/.test(html.slice(s.end))))
  return inBlock ? 'block' : 'note'
}

function traceOwner(trace, line, blockLines) {
  const { owner: path } = trace.find((r) => r.line === line)
  for (const [, n] of path.matchAll(/\/(?:item|code|table):(\d+)/g)) if (blockLines.has(Number(n))) return 'block'
  return path.includes('/footnote:') ? 'note' : 'outside'
}

test('1,920 refused-plus followers after a note block agree between trace and HTML', () => {
  const wrong = []
  let count = 0
  for (const [hostName, host] of Object.entries(HOSTS)) for (const [blockName, block] of Object.entries(BLOCKS))
    for (const [followerName, follower] of Object.entries(FOLLOWERS)) for (const blank of [false, true])
      for (const plusAt of [host.pad, host.body.slice(0, -2)]) {
        const lines = [...host.open]
        const blockLines = new Set()
        for (const text of block) {
          lines.push(host.pad + text)
          blockLines.add(lines.length)
        }
        lines.push(plusAt + '+')
        if (blank) lines.push(host.pad.trimEnd())
        const line = lines.length + 1
        lines.push(...follower(host.body))
        lines.push(...(host.close ?? []), '', 'see[^a]', '')
        const source = lines.join('\n')
        const trace = []
        const html = renderDoc(parse(source, { trace }))
        const t = traceOwner(trace, line, blockLines)
        const h = htmlOwner(html, blockName)
        if (t !== h) wrong.push(`${hostName}/${blockName}/${followerName}: trace ${t}, html ${h}\n${source}`)
        count++
      }
  assert.equal(count, 1920)
  assert.deepEqual(wrong, [], wrong.slice(0, 5).join('\n----\n'))
})
