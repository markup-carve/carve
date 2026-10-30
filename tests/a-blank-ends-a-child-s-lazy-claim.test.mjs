import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const flat = (source) => renderDoc(parse(source)).replace(/\s*\n\s*/g, ' ').replace(/> </g, '><').trim()

// A line after a blank is not a lazy fold, so the item's own paragraph takes the next lazy line (PART 0 S4).
test('a lazy line folds into the item paragraph after a closed child', () => {
  const cases = [
    ['- - # h\n\n  y\ntail\n', '<ul><li><ul><li><h1 id="h">h</h1></li></ul><p>y tail</p></li></ul>'],
    ['- - ---\n\n  y\ntail\n', '<ul><li><ul><li><hr></li></ul><p>y tail</p></li></ul>'],
    ['1. - | t |\n\n   y\ntail\n', '<ol><li><ul><li><table><tbody><tr><td>t</td></tr></tbody></table></li></ul><p>y tail</p></li></ol>'],
    ['- - # h\n\n  +\ntail\n', '<ul><li><ul><li><h1 id="h">h</h1></li></ul><p>+ tail</p></li></ul>'],
    ['- - x\n\n  y\ntail\n', '<ul><li><ul><li>x</li></ul><p>y tail</p></li></ul>'],
  ]
  for (const [source, expected] of cases) assert.equal(flat(source), expected, source)
})
