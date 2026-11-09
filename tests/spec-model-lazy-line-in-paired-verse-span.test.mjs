import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).trim()
const F = '```'

// carve#5488: a lazy line folds into the open stanza even when the verse run pairs with a later run.
test('a lazy line after a paired verse run folds into the stanza and the run ends where it stands', () => {
  assert.equal(html('- ::: |\n  ' + F + '\n:\n' + F + '\n'), `<ul>
  <li>
    <div class="line-block">
      <p><code>
:</code></p>
    </div>
  </li>
</ul>
<pre><code></code></pre>`)
})

test('the quoted fuzz shape keeps the lazy line in the stanza', () => {
  const out = html('> - x\n>   - ::: |\n>     ' + F + '\n>   :\n>   ' + F + '\n')
  assert.match(out, /<p><code>\n:<\/code><\/p>\n {10}<\/div>\n {8}<\/li>\n {6}<\/ul>\n {6}<pre><code><\/code><\/pre>/)
})

test('a closer at the content column after the lazy line closes the verse span', () => {
  assert.match(html('- ::: |\n  ' + F + '\n:\n  ' + F + '\n'), /<p><code>\n:\n<\/code><\/p>\n {4}<\/div>\n {2}<\/li>\n<\/ul>$/)
})
