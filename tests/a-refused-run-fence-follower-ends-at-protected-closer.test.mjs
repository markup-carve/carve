import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = source => renderDoc(parse(source)).trim()
const oracle = source => html(source.replace('{', '\\{'))

for (const fence of ['```', '~~~']) for (const payload of ['wa', '# h', '- x']) {
  test('a refused opener does not protect a description fence follower', () => {
    const source = `:: t\n: +\n{.x\n.y}\n${fence}\n${payload}\n${fence}\n${fence}\n`
    assert.equal(html(source), oracle(source))
  })
}

for (const prefix of ['', '- +\n', ':: t\n: +\n']) for (const fence of ['```', '~~~']) {
  test('a refused opener releases the following fence', () => {
    const source = `${prefix}{.x\n.y}\n${fence}\nwa\n${fence}\n${fence}\n`
    assert.equal(html(source), oracle(source))
  })
}

test('a tilde follower uses ordinary attachment rules', () => {
  const source = ':: t\n: +\n{.x\n.y}\n~~~\ntext\nmore\n'
  assert.equal(html(source), oracle(source))
})
