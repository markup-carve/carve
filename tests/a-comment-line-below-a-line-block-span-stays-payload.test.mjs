import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).trim()

test('the ticket shape (carve#4987)', () => {
  const expected = '<ul>\n  <li>\n    <div class="line-block">\n\n    </div>\n  </li>\n</ul>\n<pre><code> %%%%\n'
  assert.equal(html('- ::: |\n  %%%%\n %%%\n ```\n  %%%%\nz\n'), expected + 'z\n</code></pre>')
  assert.equal(html('- ::: |\n  %%%%\n %%%\n ```\n  %%%%\n'), expected + '</code></pre>')
})

// A `%%` line is column-exempt payload of the open span (PART 0 S1), so any
// other comment line in that slot reads like `%% c`, a fence-shaped one included.
// The code payload's indentation follows the hidden line's column, so it is not compared.
test('a fence-shaped comment line below the column reads like a %% line', () => {
  const hosts = [['- ', 2], ['1. ', 3], ['- - ', 4], ['- a\n  - ', 4], ['> - ', 4]]
  const runs = ['%%%', '%%%%', '%%%%%']
  const ends = ['```', '~~~', 'y', '# h']
  let checked = 0
  for (const [first, col] of hosts) for (const run of runs) for (const mid of runs) for (let at = 1; at < col; at++) for (const end of ends) for (const tail of ['z', null]) {
    if (mid === run) continue
    const quote = first.startsWith('>') ? '> ' : ''
    const body = quote + ' '.repeat(col - quote.length)
    const doc = (line) => [first + '::: |', body + run, quote + ' '.repeat(Math.max(0, at - quote.length)) + line,
      quote + ' ' + end, body + run, ...(tail === null ? [] : [tail])].join('\n') + '\n'
    if (quote && at <= quote.length) continue
    const shape = (source) => html(source).replace(/ +/g, ' ').replace(/^ /gm, '')
    assert.equal(shape(doc(mid)), shape(doc('%% c')), JSON.stringify(doc(mid)))
    checked++
  }
  assert.equal(checked, 480)
})
