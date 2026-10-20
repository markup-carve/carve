import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {test} from 'node:test'
import {parse} from '../scripts/spec/layout.mjs'
import {renderDoc} from '../scripts/spec/html.mjs'

const shapes = JSON.parse(readFileSync(new URL('./fixtures/plus-below-nested-fence-shapes.json', import.meta.url), 'utf8'))

test('a plus at the nested item marker column attaches below its fence', () => {
  assert.equal(Object.keys(shapes).length, 252)
  for (const [name, {source, html}] of Object.entries(shapes)) {
    assert.equal(renderDoc(parse(source)).trim(), html, name)
  }
})
