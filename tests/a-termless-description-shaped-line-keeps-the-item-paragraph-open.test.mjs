import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'
import { modelTrace } from '../scripts/spec/decision-trace.mjs'

const flat = (source) => renderDoc(parse(source)).trim().replace(/\s+/g, ' ')

// A `: ` line with no term above is paragraph text, so a lazy line folds into it (PART 0 S4, carve#5290).
test('a termless `: ` line in an item leaves its paragraph open for a lazy line', () => {
  assert.equal(flat('- u\n  : :: |\nb\n'), '<ul> <li>u : :: | b</li> </ul>')
  assert.equal(flat('- u\n  : # h\nb\n'), '<ul> <li>u : # h b</li> </ul>')
  assert.equal(flat('1. u\n   : +\nb\n'), '<ol> <li>u : + b</li> </ol>')
})

test('a `: ` line under a term still closes the paragraph when its body holds none', () => {
  assert.equal(flat('- a\n  :: t\n  : # h\nb\n'),
    '<ul> <li>a <dl> <dt>t</dt> <dd> <h1 id="h">h</h1> </dd> </dl> </li> </ul> <p>b</p>')
})

test('the rendered owner of the lazy line agrees with the decision trace', () => {
  for (const body of [':: |', ':: x', '# h', '---', '+', '| a |', '{.c}']) {
    const source = `- u\n  : ${body}\nb\n`
    const lazy = modelTrace(source).find((r) => r.line === 3)
    assert.equal(lazy?.form, 'lazy', source)
    assert.equal(lazy?.owner, 'doc/item:1', source)
    assert.match(flat(source), /b<\/li> <\/ul>$/, source)
  }
})
