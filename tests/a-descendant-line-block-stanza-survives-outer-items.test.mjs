import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const render = source => renderDoc(parse(source))

test('a description line block stays open through two item owners', () => {
  for (const body of [
    '      [x]: /u\n',
    '      [x]: /u\n      - l\n         :::: \n',
  ]) {
    const html = render(`- - :: u\n    : ::: |\n${body}b\n`)
    assert.match(html, /<div class="line-block">[\s\S]*<br>\nb<\/p>/)
    assert.doesNotMatch(html, /^<p>b<\/p>$/m)
  }
})

test('a valid closer ends the descendant line block before a lazy follower', () => {
  const html = render('- - :: u\n    : ::: |\n      [x]: /u\n    ::: \nb\n')
  assert.doesNotMatch(html, /<br>\nb<\/p>/)
})
