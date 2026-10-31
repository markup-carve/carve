import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

test('an overindented colon payload keeps the following lazy line at nested item depth (carve#4661)', () => {
  const source = '- - ::: |\n    a\nlazy\n     :::\ntail\n'
  assert.equal(renderDoc(parse(source)), `<ul>
  <li>
    <ul>
      <li>
        <div class="line-block">
          <p>a<br>
lazy<br>
&nbsp;:::<br>
tail</p>
        </div>
      </li>
    </ul>
  </li>
</ul>`)
})

test('an authored closer at the opener column ends the nested line block', () => {
  const source = '- - ::: |\n    a\nlazy\n    :::\ntail\n'
  const document = parse(source)
  assert.equal(document.blocks[0].items[0].blocks[0].items[0].blocks[0].t, 'line-block')
  assert.equal(document.blocks.at(-1).t, 'para')
  assert.equal(document.blocks.at(-1).lines[0], 'tail')
})
