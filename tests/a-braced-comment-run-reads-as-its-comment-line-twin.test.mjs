// carve#5853, carve#5854: a braced comment run renders as its `%%` or plain-text twin.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()

test('a %%% line inside an open {% run is run text, so a lazy line continues the item', () => {
  const hosts = [['- ', 2], ['1. ', 3], ['- [ ] ', 6], ['- x\n  - ', 4], [':: t\n: ', 2], ['[^n]: ', 4]]
  for (const [host, col] of hosts) {
    for (const middle of ['%%%', '%%% x', '%%%%']) {
      for (const follower of ['plain\n', '   more\n', '- s\n', '']) {
        const ind = ' '.repeat(col + 1)
        const src = `${host}{% a\n${ind}${middle}\n${ind}z %}\n${follower}`
        const twin = `${host}{% a\n${ind}b\n${ind}z %}\n${follower}`
        assert.equal(html(src), html(twin), src)
      }
    }
  }
})

test('a refused {% run leaves its %%% line a comment span opener', () => {
  assert.equal(html('- {% a\n   %%%\n  z %}\nplain\n'), '<ul>\n  <li>{% a</li>\n</ul>\n<p>plain</p>')
})

test('a comment-only paragraph after a blank loosens only where a %% line would', () => {
  const hosts = [['- x', 2], ['1. x', 3], ['- a\n  - x', 4], [':: t\n: x', 2], ['[^n]: x', 4]]
  const followers = ['```', '```\nc\n```', '~~~', '::: x', ':::', '# h', '> q', '- s', '```=html']
  for (const [host, col] of hosts) {
    for (const comment of [['{% a z %}'], ['{%%}'], ['{% a', ' z %}']]) {
      for (const follower of followers) {
        for (const fi of [0, col]) {
          const ind = ' '.repeat(col)
          const fol = follower.split('\n').map((l) => ' '.repeat(fi) + l).join('\n')
          const src = `${host}\n\n${comment.map((l) => ind + l).join('\n')}\n${fol}\n`
          const twin = `${host}\n\n${ind}%% c\n${fol}\n`
          assert.equal(html(src), html(twin), src)
        }
      }
    }
  }
})
