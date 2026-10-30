import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const render = (source) => renderDoc(parse(source)).trim()

const hosts = ['- ', '- - ', '1. ', '- [ ] ', '> - ', '- > ', '[^a]: ', ':: t\n: ', '- :: t\n  : ', '> ', '> > ', '::: d\n- ']
const followers = ['s', '# H', '> q', '>', '- x', '  s', '  # H', '  > q', '    s', ' s', ' # H', '~~~\nc\n~~~', '{.a}\ns', '%% c\ns', '::: e\nx\n:::', '| a |', '+', '\n\ns']

test('a + past the one space after a quote marker reads as a letter would', () => {
  for (const host of hosts) {
    for (let padding = 1; padding <= 4; padding++) {
      for (const quote of ['> ', '> > ']) {
        for (const follower of followers) {
          const doc = (content) => `${host}${quote}${' '.repeat(padding)}${content}\n${follower}\n`
          assert.equal(render(doc('+')), render(doc('Q')).replaceAll('Q', '+'), JSON.stringify(doc('+')))
        }
      }
    }
  }
})
