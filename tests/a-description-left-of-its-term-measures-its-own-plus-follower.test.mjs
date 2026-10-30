import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const render = (source) => renderDoc(parse(source)).trim()

const followers = ['h', '# H', '> q', '- x', '```\nc\n```', '{.a}\nh', '%% c\nh', '| a |', '::: d\nx\n:::']

test('a term right of its description changes nothing the description reads', () => {
  for (let term = 1; term <= 3; term++) {
    for (let description = 0; description < term; description++) {
      for (const separator of [' ', '  ']) {
        for (const body of ['+', 'd\n+', 'x']) {
          for (let column = 0; column <= 5; column++) {
            for (const follower of followers) {
              const list = (at) => ' '.repeat(at) + ':: t\n' +
                body.split('\n').map((line, i) => ' '.repeat(description) + (i === 0 ? `:${separator}` : '') + line).join('\n') + '\n' +
                follower.split('\n').map((line) => ' '.repeat(column) + line).join('\n') + '\n'
              assert.equal(render(list(term)), render(list(description)), JSON.stringify(list(term)))
            }
          }
        }
      }
    }
  }
})
