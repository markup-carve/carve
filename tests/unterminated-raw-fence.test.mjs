import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).replace(/\n+$/, '')

/**
 * A `=FORMAT` opener is a RAW block whether or not it has a closer.
 *
 * Only the terminated branch tested the `=` prefix, so an unterminated opener
 * fell through to the ordinary code path and rendered with the marker still in
 * the info string - `class="language-=html"` - and the raw bytes escaped into
 * it. All three engines pass the content through in both cases (carve#1104).
 *
 * Every raw-block corpus case terminates its fence, so nothing covered this.
 */
test('an unterminated =FORMAT fence is still a raw block', () => {
  for (const source of [
    '```=html\n<b>x</b>\n',
    '```=html\n<b>x</b>\n\n',
    '~~~=html\n<b>x</b>\n',
  ]) {
    assert.equal(html(source), '<b>x</b>', `for ${JSON.stringify(source)}`)
  }
})

test('a terminated =FORMAT fence is unchanged', () => {
  assert.equal(html('```=html\n<b>x</b>\n```\n'), '<b>x</b>')
})

test('it is a raw block inside a container too', () => {
  assert.equal(
    html('> ```=html\n> <b>x</b>\n'),
    '<blockquote>\n  <b>x</b>\n</blockquote>',
  )
})

/**
 * BOUND, not proof: an ordinary fence without a closer already ran to the end
 * of the container and keeps its info string. Neither of these moves under the
 * change - they pin what it must not touch.
 */
test('an ordinary unterminated fence is unaffected', () => {
  assert.equal(html('``` js\nx\n'), '<pre><code class="language-js">x\n</code></pre>')
  assert.equal(html('```\nx\n'), '<pre><code>x\n</code></pre>')
})
