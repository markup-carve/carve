import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).replace(/\s+/g, ' ').replace(/ ?(<[^>]+>) ?/g, '$1')
const quoted = (source) => source.split('\n').slice(0, -1).map((line) => '> ' + line).join('\n') + '\n'
const description = (term, body) => `<ul><li><dl><dt>${term}</dt><dd>${body}</dd></dl></li></ul>`
const paragraph = '<p>p</p>'

// CARVE-P2-017 and PART 9 §10 I1/I4 with carve#4018: a fence opener interrupts the
// description paragraph without a closer; a line below the body column ends it.
const positiveRows = [
  ['a fence run below the description column before a table', [
    '- :: t', '  :   p', '      ```', '    ```', '        | a |', '',
  ].join('\n'), '<ul><li><dl><dt>t</dt><dd><p>p</p><pre><code></code></pre></dd></dl><pre><code>| a |</code></pre></li></ul>'],
  ['an unclosed fence before a table', [
    '- :: t', '  :   p', '      ```', '        | a |', '',
  ].join('\n'), description('t', paragraph + '<pre><code>| a |</code></pre>')],
  ['a lazy line and an unclosed raw fence before a div', [
    '> - :: term', '>   : payload', '   code', '>       ```=html',
    '>         :::', '>  :: t2', '',
  ].join('\n'), '<blockquote>' + description('term', '<p>payload code</p>:::') + '<dl><dt>t2</dt></dl></blockquote>'],
]

for (const [name, source, expected] of positiveRows) {
  test(name, () => assert.equal(html(source), expected))
  test(`${name}, wrapped in one more quote`, () => {
    assert.equal(html(quoted(source)), `<blockquote>${expected}</blockquote>`)
  })
}

for (const [name, opener, block] of [
  ['heading', '# h', '# h'],
  ['thematic break', '***', '***'],
  ['blockquote', '> q', '&gt; q'],
  ['note', '::: note', '::: note'],
]) {
  test(`an unclosed fence takes a ${name} as payload`, () => {
    const source = ['- :: t', '  :   p', '      ```', '        ' + opener, ''].join('\n')
    assert.equal(html(source), description('t', paragraph + `<pre><code>${block}</code></pre>`))
  })
}

for (const [name, source, expected] of [
  ['plain text past the column is fence payload', [
    '- :: a', '  : p', '    ```', '      x', '',
  ].join('\n'), description('a', '<p>p</p><pre><code>x</code></pre>')],
  ['a fence closed at its own column keeps its code block', [
    '- :: term', '  : desc', '      ```', '      code', '      ```', 'after', '',
  ].join('\n'), description('term', '<p>desc</p><pre><code>code</code></pre>') + '<p>after</p>'],
  ['a fence closed at the description column keeps its code block', [
    '- :: term', '  : payload', '      ```', '      code', '    ```', 'after', '',
  ].join('\n'), description('term', '<p>payload</p><pre><code>code</code></pre>') + '<p>after</p>'],
  ['a later fence run past the opener is payload', [
    '- :: term', '  : payload', '    ```', '    code', '      ```', 'after', '',
  ].join('\n'), description('term', '<p>payload</p><pre><code>code ```</code></pre>') + '<p>after</p>'],
]) {
  test(name, () => assert.equal(html(source), expected))
}
