import assert from 'node:assert/strict'
import test from 'node:test'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

// A code fence inside an unused marker-line note is invisible. Its unclosed
// payload cannot open an item paragraph that claims the next document line.
test('unclosed marker-line note fences end at their content boundary', () => {
  const markers = ['- ', '* ', '1. ', '1) ']
  const runs = ['~~~', '```']
  const lineComments = ['%%', '%% a', '%% b', '%% note', '%% c']
  const payloads = ['e', 'word', '123', 'text', 'body']
  const tails = [']', 'tail', 'outside', 'last', 'z']
  let count = 0
  for (const marker of markers) {
    const body = ' '.repeat(marker.length + 2)
    const content = ' '.repeat(marker.length)
    const comments = [
      ...lineComments.map((comment) => `${content}${comment}`),
      ...[3, 4, 5, 6, 7].map((width) => {
        const delimiter = '%'.repeat(width)
        return `${content}${delimiter}\n${content}${delimiter}`
      }),
    ]
    for (const run of runs) for (const comment of comments) {
      for (const payload of payloads) for (const tail of tails) {
        const source = `${marker}[^n]: t\n${comment}\n\n${body}${run}\n${body}${payload}\n${tail}\n`
        assert.equal(renderDoc(parse(source)).split('\n').at(-1), `<p>${tail === ']' ? ']' : tail}</p>`, source)
        count++
      }
    }
  }
  assert.equal(count, 2000)
})
