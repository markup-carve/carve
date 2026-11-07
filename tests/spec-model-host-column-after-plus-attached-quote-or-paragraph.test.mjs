import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'
import { modelTrace } from '../scripts/spec/decision-trace.mjs'

// A line at a `+` host's content column that cannot fold into the attached
// paragraph or quote opens in the host (CARVE-P0-011, CARVE-P0-024; carve#5421, carve#5427).
const norm = (html) => html.replace(/\s+/g, ' ').replace(/> </g, '><')
const render = (src) => norm(renderDoc(parse(src)))

test('a fence at a pulled footnote column opens in the note', () => {
  const html = render('[^1]\n\n[^1]: +\nh\n  ```\nz\n')
  assert.match(html, /<li id="fn1"><p>h<\/p><pre><code><\/code><\/pre>/)
  assert.match(html, /<p>z<\/p><section/)
})

test('an attribute line at a pulled footnote column opens in the note', () => {
  assert.match(render('[^1]\n\n[^1]: +\nh\n  {.c}\n  k\n'), /<li id="fn1"><p>h<\/p><p class="c">k/)
})

const hosts = {
  item: (body) => [`- +\n${body}`, '<li>', '</li>'],
  note: (body) => [`[^1]: +\n${body}\n[^1]\n`, '<li id="fn1">', '</li>'],
  description: (body) => [`:: t\n: +\n${body}`, '<dd>', '</dd>'],
}
const followers = {
  heading: ['  # G', 'G</h1>'],
  div: ['  ::: w\n  G\n  :::', '<div class="w"><p>G'],
  attribute: ['  {.c}\n  G', '<p class="c">G'],
  list: ['  - G', '<li>G'],
}

for (const [name, host] of Object.entries(hosts)) {
  for (const [kind, [follower, mark]] of Object.entries(followers)) {
    test(`${/^[aeiou]/.test(kind) ? 'an' : 'a'} ${kind} at the ${name}'s content column after a plus-attached quote stays in the ${name}`, () => {
      const [src, open, close] = host(`> q\n${follower}\n`)
      const html = render(src)
      const at = html.indexOf(open)
      const inside = html.slice(at, html.indexOf(close, html.indexOf(mark, at)) + close.length)
      assert.match(inside, /<blockquote><p>q<\/p><\/blockquote>/, html)
      assert.ok(at >= 0 && html.indexOf(mark, at) > at && inside.includes(mark), html)
      const line = src.split('\n').indexOf(follower.split('\n')[0]) + 1
      assert.notEqual(modelTrace(src).find((r) => r.line === line).owner, 'doc')
    })
  }
}

test('plain text after a plus-attached quote still folds into it', () => {
  assert.equal(render('- +\n> q\n  x\n'), '<ul><li><blockquote><p>q x</p></blockquote></li></ul>')
})

// Below the host's content column the line leaves the host, in the trace as in the HTML (carve#5430).
for (const follower of [' # G', ' {.c}\n G', ' ::: w\n G\n :::']) {
  test(`the trace leaves the host for ${JSON.stringify(follower.split('\n')[0])} below its column after a plus-attached quote`, () => {
    const src = `- +\n> q\n${follower}\n`
    assert.match(render(src), /<\/ul><(section|p|div)/)
    assert.match(modelTrace(src).find((r) => r.line === 3).owner, /^doc(\/div:3)?$/)
  })
}

test('a caption under a plus-attached quote still captions it', () => {
  assert.equal(render('- text\n+\n> q\n^ cap\n- c\n'),
    '<ul><li>text <figure><blockquote><p>q</p></blockquote><figcaption>cap</figcaption></figure></li><li>c</li></ul>')
})
