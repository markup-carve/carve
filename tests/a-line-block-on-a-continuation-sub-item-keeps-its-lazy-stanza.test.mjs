import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).trim()

const folded = [
  '<ul>',
  '  <li>a',
  '    <ul>',
  '      <li>',
  '        <div class="line-block">',
  '          <p><br>',
  'b</p>',
  '        </div>',
  '      </li>',
  '    </ul>',
  '  </li>',
  '</ul>',
].join('\n')

for (const payload of ['%% c', '%%', '%%%']) {
  test(`a line block on a continuation-line sub-item folds the lazy line after \`${payload}\``, () => {
    assert.equal(html(`- a\n  - ::: |\n    ${payload}\nb\n`), folded)
  })
}

test('a chained continuation-line sub-item folds it too', () => {
  assert.equal(html('- a\n  - - ::: |\n      %% c\nb\n'), [
    '<ul>',
    '  <li>a',
    '    <ul>',
    '      <li>',
    '        <ul>',
    '          <li>',
    '            <div class="line-block">',
    '              <p><br>',
    'b</p>',
    '            </div>',
    '          </li>',
    '        </ul>',
    '      </li>',
    '    </ul>',
    '  </li>',
    '</ul>',
  ].join('\n'))
})
