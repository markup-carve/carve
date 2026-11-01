// carve#4807: a code fence whose language token ends at whitespace, a quote,
// `{` or `[` recovers from invalid metadata like a colon fence (PART 9 §2).
import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'

const recovered = [
  'js title="x"', 'js {1,3}', 'js{1,3}', 'raw html', 'php {.x}', 'php [tab] "title"',
  'js"title"', 'js[label]', 'js "title"[label]', 'js "T" junk', 'js\t"T"', 'js “x”', 'js x',
]
const fallback = ['js,title="x"', ' {.x}', '\tjs', '  js', 'js=html', '"title"[label]']

for (const run of ['```', '~~~', '````']) {
  for (const info of recovered) test(`${JSON.stringify(run + info)} opens a code block`, () => {
    const source = [run + info, 'payload', run].join('\n') + '\n'
    assert.deepEqual(parse(source).blocks, [{ t: 'code', lang: info.match(/^[\w-]+/)[0], title: null, text: 'payload\n' }])
  })
  for (const info of recovered) test(`${JSON.stringify(run + info)} interrupts a paragraph`, () => {
    const source = ['lead', run + info, 'payload', run].join('\n') + '\n'
    assert.equal(parse(source).blocks[1].t, 'code')
  })
  for (const info of fallback) test(`${JSON.stringify(run + info)} still falls back`, () => {
    const lines = [run + info, 'payload']
    assert.deepEqual(parse(lines.join('\n') + '\n').blocks, [{ t: 'para', lines }])
  })
}

for (const [line, why] of [
  ['```js foo``` is inline', 'an equal run'],
  ['```js foo```` x', 'a longer run'],
  ['~~~js foo ~~~', 'a tilde run'],
]) test(`${JSON.stringify(line)} keeps its inline reading: ${why}`, () => {
  assert.deepEqual(parse(line + '\n').blocks, [{ t: 'para', lines: [line] }])
})

test('a shorter later run does not block recovery', () => {
  assert.equal(parse('````js foo``` x\npayload\n````\n').blocks[0].t, 'code')
})
