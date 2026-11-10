import assert from 'node:assert/strict'
import test from 'node:test'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'
import { modelTrace } from '../scripts/spec/decision-trace.mjs'

const render = (source) => renderDoc(parse(source))

// CARVE-P9-083: the task box is content, so a marker-line run opens past it
// and its follower reads as in a plain item (CARVE-P2-035, carve#5792).
for (const [name, source, host, body] of [
  ['task item', '- [ ] {.x\n      .y}\n[^m]: q\n', 'doc/item:1', '> {.x\n.y}\n[^m]: q</li>'],
  ['done task item with a comment run', '- [x] {% a\n      %}\n[^m]: q\n', 'doc/item:1', '> {% a\n%}\n[^m]: q</li>'],
  ['task item in a quote', '> - [ ] {.x\n>       .y}\n> [^m]: q\n', 'doc/quote:1/item:1', '> {.x\n.y}\n[^m]: q</li>'],
  ['nested task item', '- p\n  - [ ] {.x\n        .y}\n[^m]: q\n', 'doc/item:1/item:2', '> {.x\n.y}\n[^m]: q</li>'],
]) {
  test(`a ${name} keeps the refused run's note definition follower`, () => {
    const at = source.split('\n').findIndex((line) => line.includes('[^m]:')) + 1
    assert.equal(modelTrace(source).find((r) => r.line === at).owner, host)
    const html = render(source)
    assert.ok(html.includes(body), html)
    assert.doesNotMatch(html, /doc-endnotes/)
  })
}

test('a run deeper than the text past the task box is still an attribute run', () => {
  assert.equal(render('- [ ] {.x\n       .y}\n'),
    '<ul class="task-list">\n  <li><input type="checkbox" disabled> </li>\n</ul>')
})

const note = (body) => [
  '<p>x<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>',
  '<section role="doc-endnotes" aria-label="Footnotes">',
  '  <hr>',
  '  <ol>',
  '    <li id="fn1">',
  body,
  '    </li>',
  '  </ol>',
  '</section>',
].join('\n')

// A lazy comment run is measured through its frame, as at the body column,
// so its unclosed fence follower is code-span text (carve#5769, carve#5792).
for (const column of [0, 1, 2]) {
  test(`a refused comment run at column ${column} of a note keeps its unclosed fence follower`, () => {
    const pad = ' '.repeat(column)
    assert.equal(render(`[^n]: p\n${pad}{% a\n${pad}%}\n  \`\`\`\nafter\n\nx[^n]\n`), note([
      '      <p>p',
      '{% a',
      '%}',
      '<code>',
      'after</code><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>',
    ].join('\n')))
  })
}

// A lazy attribute run misses the note and keeps nothing (PART 0 S4, carve#5200).
test('a lazy attribute run in a note leaves its fence follower a block fence', () => {
  assert.equal(render('[^n]: p\n{.x\n.y}\n  ```\nafter\n\nx[^n]\n'), [
    '<p>after</p>',
    note([
      '      <p>p',
      '{.x',
      '.y}</p>',
      '      <pre><code></code></pre>',
      '      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>',
    ].join('\n')),
  ].join('\n'))
})
