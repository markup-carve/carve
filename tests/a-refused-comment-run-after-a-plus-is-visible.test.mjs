/*
 * A `{%` run whose continuation is not indented past its `{` is paragraph text
 * (CARVE-P2-035), not a paragraph of only comments (CARVE-P9-042), so a `+`
 * reads its gates on the run and attaches it (CARVE-P9-067, carve#5195). Each
 * case is checked against the same paragraph written with a refused attribute
 * run, which already read this way.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const render = (src) => renderDoc(parse(src)).trim()

test('a refused comment run after a separate-line + joins the item', () => {
  assert.equal(render('- a\n+\n{% x\n%}\n'), '<ul>\n  <li>a\n    {% x\n%}\n  </li>\n</ul>')
})

test('the line after the run continues the attached paragraph', () => {
  const kept = '<ul>\n  <li>a\n    {% x\n%}\n{y}\nmore\n  </li>\n</ul>'
  assert.equal(render('- a\n+\n{% x\n%}\n{y}\n more\n'), kept)
  assert.equal(render('- a\n+\n{% x\n%}\n{y}\n  more\n'), kept)
})

test('each host attaches a refused comment run as it attaches a refused attribute run', () => {
  const hosts = ['- a\n+\n', '- +\n', '> a\n+\n', '> +\n', ':: t\n: d\n+\n', '[^n]: x\n+\n', '1. a\n+\n', '- [ ] a\n+\n']
  for (const host of hosts) {
    for (const follower of ['', '- b\n', '\ntext\n', '# H\n']) {
      const comment = render(host + '{% x\n%}\n' + follower)
      const attr = render(host + '{x\n}\n' + follower)
      assert.equal(comment, attr.replace('{x\n}', '{% x\n%}'), JSON.stringify(host + follower))
    }
  }
})

test('a comment run continued past its brace is still skipped', () => {
  assert.equal(render('- a\n+\n{% x\n %}\n# H\n'), '<ul>\n  <li>a\n    <h1 id="H">H</h1>\n  </li>\n</ul>')
})
