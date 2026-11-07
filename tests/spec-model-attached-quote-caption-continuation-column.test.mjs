import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const caption = (source) => renderDoc(parse(source)).match(/<figcaption>([\s\S]*?)<\/figcaption>/)?.[1]

test('a caption after a plus-attached quote uses its host column for continuation lines', () => {
  for (const marker of ['-', '*', '1.', '1)']) {
    const column = ' '.repeat(marker.length + 1)
    const source = `${marker} +\n> q\n${column}^ cap\n${column}more\n`
    assert.equal(caption(source), 'cap\nmore', source)
    assert.equal(caption(`${marker} +\n> q\n${column}^ cap\n${column}  more\n`), 'cap\n  more', source)
  }
})
