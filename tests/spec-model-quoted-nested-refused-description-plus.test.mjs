import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

test('a refused description plus opens no paragraph for an unmarked quote follower', () => {
  for (const text of ['h', 'plain', 'two words']) {
    const html = renderDoc(parse(`> - :: t\n>   : +\n ${text}\n`))
    assert.match(html, new RegExp(`</blockquote>\\n<p>${text}</p>`))
  }
})
