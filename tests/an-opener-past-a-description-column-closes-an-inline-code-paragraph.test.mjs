import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).replace(/\s+/g, ' ').replace(/ ?(<[^>]+>) ?/g, '$1')
const quoted = (source) => source.split('\n').slice(0, -1).map((line) => '> ' + line).join('\n') + '\n'
const description = (term, body) => `<ul><li><dl><dt>${term}</dt><dd>${body}</dd></dl></li></ul>`
const table = '<table><tbody><tr><td>a</td></tr></tbody></table>'
const paragraph = '<p>p<code></code></p>'

// CARVE-P2-017 and PART 9 §10 I1/I4: an unclosed fence establishes no body base;
// a block opener past the description column closes the inline-code paragraph.
const positiveRows = [
  ['a fence run at the description column before a table', [
    '- :: t', '  :   p', '      ```', '    ```', '        | a |', '',
  ].join('\n'), description('t', paragraph + table)],
  ['an open inline code span before a table', [
    '- :: t', '  :   p', '      ```', '        | a |', '',
  ].join('\n'), description('t', paragraph + table)],
  ['a lazy line and a raw-looking inline code span before a div', [
    '> - :: term', '>   : payload', '   code', '>       ```=html',
    '>         :::', '>  :: t2', '',
  ].join('\n'), '<blockquote>' + description('term', '<p>payload code<code>=html</code></p><div></div>') + '<dl><dt>t2</dt></dl></blockquote>'],
]

for (const [name, source, expected] of positiveRows) {
  test(name, () => assert.equal(html(source), expected))
  test(`${name}, wrapped in one more quote`, () => {
    assert.equal(html(quoted(source)), `<blockquote>${expected}</blockquote>`)
  })
}

for (const [name, opener, block] of [
  ['heading', '# h', '<h1 id="h">h</h1>'],
  ['thematic break', '***', '<hr>'],
  ['blockquote', '> q', '<blockquote><p>q</p></blockquote>'],
  ['note', '::: note', '<aside class="admonition note" aria-label="Note"></aside>'],
]) {
  test(`an open inline code span before a ${name}`, () => {
    const source = ['- :: t', '  :   p', '      ```', '        ' + opener, ''].join('\n')
    assert.equal(html(source), description('t', paragraph + block))
  })
}

for (const [name, source, expected] of [
  ['plain text past the column folds into inline code', [
    '- :: a', '  : p', '    ```', '      x', '',
  ].join('\n'), description('a', 'p<code>x</code>')],
  ['a fence closed at its own column keeps its code block', [
    '- :: term', '  : desc', '      ```', '      code', '      ```', 'after', '',
  ].join('\n'), description('term', '<p>desc</p><pre><code>code</code></pre>') + '<p>after</p>'],
  ['a fence closed at the description column keeps its code block', [
    '- :: term', '  : payload', '      ```', '      code', '    ```', 'after', '',
  ].join('\n'), description('term', '<p>payload</p><pre><code>code</code></pre>') + '<p>after</p>'],
  ['a later fence run at neither closing column stays paragraph text', [
    '- :: term', '  : payload', '    ```', '    code', '      ```', 'after', '',
  ].join('\n'), description('term', 'payload<code>code</code>after')],
]) {
  test(name, () => assert.equal(html(source), expected))
}
