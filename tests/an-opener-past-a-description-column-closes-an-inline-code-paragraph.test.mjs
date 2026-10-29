import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).replace(/\s+/g, ' ').replace(/ ?(<[^>]+>) ?/g, '$1')
const quoted = (source) => source.split('\n').slice(0, -1).map((line) => '> ' + line).join('\n') + '\n'
const description = (term, body) => `<ul><li><dl><dt>${term}</dt><dd>${body}</dd></dl></li></ul>`
const paragraph = '<p>p</p>'
const code = (text) => `<pre><code>${text}</code></pre>`

// PART 9 §10 I4 (carve#4018): an unclosed fence under the description's
// paragraph opens and takes the lines past the column as payload.
const positiveRows = [
  ['a fence run at the description column before a table', [
    '- :: t', '  :   p', '      ```', '    ```', '        | a |', '',
  ].join('\n'), '<ul><li><dl><dt>t</dt><dd>' + paragraph + code('') + '</dd></dl>' + code('| a |') + '</li></ul>'],
  ['an unclosed fence before a table', [
    '- :: t', '  :   p', '      ```', '        | a |', '',
  ].join('\n'), description('t', paragraph + code('| a |'))],
  ['a lazy line and an unclosed raw block before a div', [
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

for (const [name, opener, payload] of [
  ['heading', '# h', '# h'],
  ['thematic break', '***', '***'],
  ['blockquote', '> q', '&gt; q'],
  ['note', '::: note', '::: note'],
]) {
  test(`an unclosed fence takes a ${name} as payload`, () => {
    const source = ['- :: t', '  :   p', '      ```', '        ' + opener, ''].join('\n')
    assert.equal(html(source), description('t', paragraph + code(payload)))
  })
}

for (const [name, source, expected] of [
  ['plain text past the column is the unclosed fence\'s payload', [
    '- :: a', '  : p', '    ```', '      x', '',
  ].join('\n'), description('a', '<p>p</p>' + code('x'))],
  ['a fence closed at its own column keeps its code block', [
    '- :: term', '  : desc', '      ```', '      code', '      ```', 'after', '',
  ].join('\n'), description('term', '<p>desc</p><pre><code>code</code></pre>') + '<p>after</p>'],
  ['a fence closed at the description column keeps its code block', [
    '- :: term', '  : payload', '      ```', '      code', '    ```', 'after', '',
  ].join('\n'), description('term', '<p>payload</p><pre><code>code</code></pre>') + '<p>after</p>'],
  ['a later fence run past the opener is payload of the unclosed fence', [
    '- :: term', '  : payload', '    ```', '    code', '      ```', 'after', '',
  ].join('\n'), description('term', '<p>payload</p>' + code('code ```')) + '<p>after</p>'],
]) {
  test(name, () => assert.equal(html(source), expected))
}
