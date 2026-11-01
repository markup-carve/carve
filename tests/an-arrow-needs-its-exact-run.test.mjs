/*
 * An arrow needs its exact run: a hyphen run longer than the arrow's is a dash
 * run, at either end (carve#4645).
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()

for (const [src, out] of [
  ['a<---b', 'a&lt;—b'],
  ['<--->', '&lt;—&gt;'],
  ['a--->b', 'a—&gt;b'],
  ['a<----b', 'a&lt;––b'],
  ['a---->b', 'a––&gt;b'],
  ['a <--- b', 'a &lt;— b'],
  ['a ---> b', 'a ---&gt; b'],
  ['<----->', '&lt;—–&gt;'],
  ['a<--b', 'a←b'],
  ['a-->b', 'a→b'],
  ['a<-->b', 'a↔b'],
  ['a<--', 'a←'],
  ['<-->-', '↔-'],
]) {
  test(`${src} renders ${out}`, () => {
    assert.equal(html(`${src}\n`), `<p>${out}</p>`)
  })
}
