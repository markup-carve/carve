/*
 * A braced comment counts as nothing for every flank test, so removing one never
 * changes the output: quote direction, the hyphen flag test and the bare emphasis
 * guards (carve#4719). Each case states the document without its comment.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()

test('the ruling reproduction', () => {
  assert.equal(html('{%%}--x\n\na{%%}*b*\n'), '<p>--x</p>\n<p>a*b*</p>')
})

for (const src of [
  // Hyphen runs.
  '({%%}--x)', '(--{%%}x)', '{%%}--x', 'a {%%}--x', 'a --{%%}x', 'a {%%}--{%%}x', 'a--{%%}', '--{%%} x', 'x{%%}--y', 'x --{%%}', '*{%%}--x*',
  '*--{%%}*', '{*{%%}--x*}', '{*x --{%%}*}', 'a {%%}---{%%} b',
  // The look-behind and look-ahead of every bare delimiter.
  ...['*', '/', '_', '~', '='].flatMap((d) => [
    `a{%%}${d}b${d}`, `${d}b${d}{%%}c`, `x ${d}{%%} b${d}`, `${d}b {%%}${d}`, `${d}{%%}b${d}`, `${d}b{%%}${d}`, `a {%%}${d}b${d}`,
    `${d}b${d}{%%} c`, `${d}{%%}${d}`, `${d}${d}{%%}`, `{%%}${d}b${d}`,
  ]),
  // Guards and the combined token.
  '_{%%}*a*', '/{%%}*a*', '/{%%}_a_', '=>a=', '={%%}>a=', '/*a*/{%%}', 'x{%%}/*a*/', '/*a*/{%%}b', '/*{%%} a*/', '/*a {%%}*/', 
  // Quote direction stays as ruled.
  '"a-"{%%}', 'a{%%}"b"', "'{%%}90s", '{%%}"x"',
]) {
  test(`removing the comment from ${src} changes nothing`, () => {
    assert.equal(html(`${src}\n`), html(`${src.replaceAll('{%%}', '')}\n`))
  })
}
