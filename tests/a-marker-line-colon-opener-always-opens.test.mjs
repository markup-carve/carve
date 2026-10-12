import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = source => renderDoc(parse(source))
const followers = [
  ['flush-left text', 'tail'],
  ['below-column text', ' text'],
  ['blank then text', '\ntext'],
  ['sibling marker', '- sibling'],
  ['matched below-column comment span', ' %%%\n hidden\n %%%'],
  ['below-column line comment', ' %% c\n text'],
]
for (const opener of ['::: d', ':::', '::: |']) {
  for (let depth = 0; depth <= 2; depth++) {
    const prefix = '> '.repeat(depth)
    for (const [name, follower] of followers) {
      // An open line block reads comment followers as literal payload.
      if (opener === '::: |' && name.includes('comment')) continue
      test(`${opener}, quote depth ${depth}, ${name} matches an explicit closer`, () => {
        const tail = follower.split('\n').map(line => prefix + line).join('\n')
        const head = `${prefix}- ${opener}\n`
        assert.equal(html(head + tail + '\n'), html(head + prefix + '  :::\n' + tail + '\n'))
      })
    }
  }
}
test('a marker-line opener leaves flush-left text outside its quote', () => {
  assert.equal(html('> - ::: d\ntail\n'), html('> - ::: d\n>   :::\ntail\n'))
})
test('a matched below-column span hides its payload after an empty container', () => {
  assert.equal(html('- ::: inner\n %%%\n hidden\n %%%\n'), html('- ::: inner\n'))
})
test('a content-column body keeps its paragraph available for lazy folding', () => {
  assert.equal(html('- ::: d\n  body\ntail\n'), '<ul>\n  <li>\n    <div class="d">\n      <p>body\ntail</p>\n    </div>\n  </li>\n</ul>')
})
