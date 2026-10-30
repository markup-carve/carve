import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).replace(/\n[ \t]*(?=<)/g, '').trim()

const blocks = {
  paragraph: ['l'],
  heading: ['# H'],
  fence: ['```', 'x', '```'],
  quote: ['> q'],
  rule: ['---'],
  table: ['|a|'],
  div: [':::', 'x', ':::'],
  list: ['- i'],
  attributed: ['{.c}', 'l'],
}

const twin = ([first, ...rest], follower) => [':: t', `: ${first}`, ...rest.map((line) => `  ${line}`), follower].join('\n')

// carve#4408: the `+` decides where its block attaches and nothing else.
for (const [name, lines] of Object.entries(blocks)) {
  for (const col of [0, 1, 2, 3]) {
    const follower = `${' '.repeat(col)}: b`
    test(`a ": " line at column ${col} after a +-attached ${name} reads as without the +`, () => {
      assert.equal(html([':: t', ': +', ...lines, follower].join('\n')), html(twin(lines, follower)))
    })
  }
}

test('a line at the body column stays in the body', () => {
  assert.equal(html(':: t\n: +\n# H\n  : b\n'), '<dl><dt>t</dt><dd><h1 id="H">H</h1><p>: b</p></dd></dl>')
  assert.equal(html(':: t\n: a\n+\n# H\n  : b\n'), '<dl><dt>t</dt><dd><p>a</p><h1 id="H">H</h1><p>: b</p></dd></dl>')
})

test('a lone + leaves the description open too', () => {
  assert.equal(html(':: t\n: a\n+\n> q\n : b\n'), '<dl><dt>t</dt><dd><p>a</p><blockquote><p>q</p></blockquote></dd><dd>b</dd></dl>')
  assert.equal(html(':: t\n: a\n+\n- i\n: b\n'), '<dl><dt>t</dt><dd><p>a</p><ul><li>i</li></ul></dd><dd>b</dd></dl>')
})

test('a comment the + took leaves the description open', () => {
  assert.equal(html(':: t\n: +\n%% c\n : b\n'), '<dl><dt>t</dt><dd></dd><dd>b</dd></dl>')
})

test('hosts in a quote and an item read the same', () => {
  assert.equal(html('> :: t\n> : +\n> - q\n>  : b\n'), '<blockquote><dl><dt>t</dt><dd><ul><li>q</li></ul></dd><dd>b</dd></dl></blockquote>')
  assert.equal(html('- :: t\n  : +\n  > q\n   : b\n'), '<ul><li><dl><dt>t</dt><dd><blockquote><p>q</p></blockquote></dd><dd>b</dd></dl></li></ul>')
})

test('a block past the attached one has ended the list', () => {
  assert.equal(html(':: t\n: +\n# H\nz\n : b\n'), '<dl><dt>t</dt><dd><h1 id="H">H</h1></dd></dl><p>z\n: b</p>')
})
