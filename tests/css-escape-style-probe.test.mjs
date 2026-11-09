import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const render = (source) => renderDoc(parse(source)).trim()

test('CSS escapes cannot hide any forbidden style pattern', () => {
  const values = [
    'u\\rl(x)', '\\75 rl(x)', '\\000075rl(x)', 'URL\\28 x)',
    'ex\\70 ression(x)', '@im\\70 ort x', 'beha\\76 ior:x',
    '-moz-\\62 inding:x', 'u\\000072l(x)', 'u\\72 l\\28 x)',
  ]
  const carriers = [
    (value) => `[a]{style="${value}"}\n`,
    (value) => `*a*{style="${value}"}\n`,
    (value) => `{style="${value}"}\na\n`,
  ]
  for (const value of values) for (const carrier of carriers) {
    const source = carrier(value)
    assert.match(render(source), /style=""/, JSON.stringify(source))
  }
})

test('a safe CSS escape keeps its emitted spelling', () => {
  assert.equal(render('[a]{style="color:safe\\-name"}\n'), '<p><span style="color:safe-name">a</span></p>')
  assert.equal(render('[a]{style="color:\\72 ed"}\n'), '<p><span style="color:\\72 ed">a</span></p>')
})
