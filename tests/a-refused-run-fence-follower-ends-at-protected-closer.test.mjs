import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()

for (const fence of ['```', '~~~']) for (const payload of ['wa', '# h', '- x']) {
  test(`a description-attached refused run protects only its first ${fence} pair with ${payload}`, () => {
    const src = `:: t\n: +\n{.x\n.y}\n${fence}\n${payload}\n${fence}\n${fence}\n`
    const out = html(src)
    assert.match(out, /<\/dd>\n<\/dl>\n<pre><code><\/code><\/pre>$/)
    assert.match(out, /<dd>\{\.x\n\.y\}/)
  })
}
