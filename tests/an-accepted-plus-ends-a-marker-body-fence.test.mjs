import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = source => renderDoc(parse(source)).replace(/>\s+</g, '><').trim()

// PART 9 §17 L3/L4: a `+` at its host's marker column ends an open code, raw
// or colon fence, and the attached block follows it, in every marker body.
test('a description body ends its open fence at an accepted +', () => {
  assert.equal(html(':: t\n: ```\n+\n> q\n'),
    '<dl><dt>t</dt><dd><pre><code></code></pre><blockquote><p>q</p></blockquote></dd></dl>')
})

test('a footnote body ends its open fence at an accepted +', () => {
  assert.match(html('[^n]: ```\n+\n> q\n\nr[^n]\n'),
    /<li id="fn1"><pre><code><\/code><\/pre><blockquote><p>q<\/p><\/blockquote>/)
})

test('a description body ends its open colon fence at an accepted +', () => {
  assert.equal(html(':: t\n: :::\n+\n> q\n'),
    '<dl><dt>t</dt><dd><div></div><blockquote><p>q</p></blockquote></dd></dl>')
})

const fences = ['```', '~~~', '```=html', ':::', '::: note']
const payloads = [[], ['  x'], ['  x', '']]
const followers = [['> q'], ['p'], ['# h'], ['|a|'], ['- l']]
const word = f => f[0].replace(/^[>#|\- ]+/, '').replace(/\|/g, '')
const payload = h => /<pre><code[^>]*>([\s\S]*?)<\/code><\/pre>/.exec(h)?.[1] ?? ''

for (const fence of fences) {
  for (const body of payloads) {
    for (const follower of followers) {
      const rest = [...body, '+', ...follower]
      const item = ['- ' + fence, ...rest].join('\n') + '\n'
      const shapes = {
        description: [':: t', ': ' + fence, ...rest].join('\n') + '\n',
        footnote: ['[^n]: ' + fence, ...rest, '', 'r[^n]'].join('\n') + '\n',
      }
      for (const [host, source] of Object.entries(shapes)) {
        test(`${host} ${JSON.stringify(source)} keeps its follower out of the fence as the item does`, () => {
          const w = word(follower)
          assert.equal(payload(html(source)).includes(w), payload(html(item)).includes(w))
          assert.ok(html(source).includes(w))
        })
      }
    }
  }
}
