import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).replace(/\s+/g, ' ').replace(/ ?(<[^>]+>) ?/g, '$1')
const quoted = (depth, lines) => lines.map((line) => ('> '.repeat(depth) + line).trimEnd()).join('\n') + '\n'
// Indentation is line-block payload, so it renders; compare without it.
const unindented = (out) => out.replace(/(&nbsp;)+/g, '').replace(/ +<\/code>/g, '</code>')

const shapes = {
  bad: (pad, run) => [pad + run, '  :::', pad + run, '  :::', '  :::bad', '  :::'],
  para: (pad, run) => [pad + run, '  :::', pad + run, '  :::', '  para'],
  open: (pad, run) => [pad + run, '  :::', pad + run, '  x'],
  inner: (pad, run) => [pad + run, pad + ':::', pad + run, '  :::', '  para'],
}

// Ruled on carve-php#3137: two runs in a line-block payload pair as one inline
// span at the content column and past it.
for (const depth of [0, 1, 2]) for (const run of ['```', '~~~', '````']) for (const over of [1, 2, 4]) {
  for (const [name, shape] of Object.entries(shapes)) for (const tail of ['- tail', 'tail']) {
    const at = quoted(depth, ['- ::: |', ...shape('  ', run)]) + tail + '\n'
    const past = quoted(depth, ['- ::: |', ...shape(' '.repeat(2 + over), run)]) + tail + '\n'
    test(`a payload span past the column reads as at it: depth ${depth}, ${run}, +${over}, ${name}, ${tail}`, () => {
      assert.equal(unindented(html(past)), unindented(html(at)))
      assert.doesNotMatch(html(past), /<pre>/)
    })
  }
}

for (const depth of [0, 1, 2]) for (const run of ['```', '~~~']) {
  test(`the colon run between the runs is payload: depth ${depth}, ${run}`, () => {
    const out = html(quoted(depth, ['- ::: |', '    ' + run, '  :::', '    ' + run, '  :::']))
    assert.match(out, /<div class="line-block"><p>[^<]*(<code>|<br>)?:::[^<]*(<\/code>|<br>)[^]*<\/div><\/li><\/ul>/)
  })
  // Control: a lone run pairs with nothing.
  test(`a lone run pairs with nothing and the colon run closes the line block: depth ${depth}, ${run}`, () => {
    const out = html(quoted(depth, ['- ::: |', '    ' + run, '  :::', '  para']))
    assert.match(out, /<\/div>para<\/li>/)
  })
}
