import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const id = (src) => renderDoc(parse(src)).match(/id="([^"]*)"/)[1]

test('a heading id reverses every double arrow to ASCII (carve#4293)', () => {
  assert.equal(id('# a <== b\n'), 'a-b')
  assert.equal(id('# a <=> b\n'), 'a-b')
  assert.equal(id('# a ==> b\n'), 'a-b')
  assert.equal(id('# <==\n'), 's')
})
