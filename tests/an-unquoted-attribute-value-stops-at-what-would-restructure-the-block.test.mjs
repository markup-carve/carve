/*
 * Pin the unquoted_value character set widened by carve#2440. Every row now
 * holds for the oracle and the pinned engine alike; `engine` records a
 * divergence where one reappears.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'
import { carveToHtml } from '@markup-carve/carve'

const cases = [
  { value: 'w-1/2', oracle: '<p><strong k="w-1/2">x</strong></p>' },
  { value: 'a+b', oracle: '<p><strong k="a+b">x</strong></p>' },
  { value: 'a%b', oracle: '<p><strong k="a%b">x</strong></p>' },
  { value: 'a(b', oracle: '<p><strong k="a(b">x</strong></p>' },
  { value: 'a#b', oracle: '<p><strong k="a#b">x</strong></p>' },
  { value: 'a:b', oracle: '<p><strong k="a:b">x</strong></p>' },
  { value: 'a,b', oracle: '<p><strong k="a,b">x</strong></p>' },
  { value: 'a=b', oracle: '<p><strong k="a=b">x</strong></p>' },
  { value: 'a{b', oracle: '<p><strong k="a{b">x</strong></p>' },
  { value: 'a}b', excluded: true, oracle: '<p><strong k="a">x</strong>b}</p>' },
  { value: 'a b', excluded: true, oracle: '<p><strong k="a" b="">x</strong></p>' },
  { value: 'a"b', excluded: true, oracle: '<p><strong>x</strong>{k=a”b}</p>' },
  { value: "a'b", excluded: true, oracle: '<p><strong>x</strong>{k=a’b}</p>' },
  { value: 'a\tb', excluded: true, oracle: '<p><strong>x</strong>{k=a\tb}</p>' },
  { value: 'a\nb', excluded: true, oracle: '<p><strong>x</strong>{k=a\nb}</p>' },
  { value: 'a|b', excluded: true, oracle: '<p><strong>x</strong>{k=a|b}</p>' },
  { value: 'a\\b', excluded: true, oracle: '<p><strong>x</strong>{k=a\\b}</p>' },
]

for (const { value, oracle, engine = oracle } of cases) {
  test(`unquoted attribute value ${JSON.stringify(value)}`, () => {
    const src = `*x*{k=${value}}\n`
    assert.equal(renderDoc(parse(src)).trim(), oracle, 'oracle')
    const result = carveToHtml(src)
    assert.equal((typeof result === 'string' ? result : result.value).trim(), engine, 'engine')
  })
}

test('the table covers every excluded character in unquoted_value', () => {
  for (const character of new Set(`}|"'\\ \t\n`)) {
    assert(cases.some(({ value, excluded }) => excluded && value.includes(character)),
      `missing excluded character ${JSON.stringify(character)}`)
  }
})
