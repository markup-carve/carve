// CARVE-P9-054 (carve#4472, carve#4473): no denied value reaches the page, whatever
// control sits in it. The corpus page 855 pins the shapes every engine shares.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const render = (src) => renderDoc(parse(src)).trim()
const BIDI = ['‪', '‫', '‬', '‭', '‮', '⁦', '⁧', '⁨', '⁩']
const VALUES = (c) => [`ur${c}l(x)`, `ex${c}pression(x)`, `-moz${c}-binding`, `java${c}script:x`, `${c}javascript:x`, `a 1x,java${c}script:x 2x`]
const CARRIERS = [(a) => `{${a}}\np\n`, (a) => `*x*{${a}}\n`, (a) => `[a]{${a}}\n`, (a) => `|{${a}} x |\n`]
const KEYS = ['style', 'k', 'srcset', 'href', 'src', 'class', 'id']
const LIVE = /="(?:[^"]*,)?\s*javascript:|url\(|expression\(|-moz-binding/

test('a bidi control keeps its value inert in every carrier', () => {
  for (const c of BIDI) for (const v of VALUES(c)) for (const k of KEYS) for (const carrier of CARRIERS) {
    const src = carrier(`${k}="${v}"`)
    assert.doesNotMatch(render(src), LIVE, JSON.stringify(src))
  }
})

// carve#5049: the model's frame characters are literal in an authored value, so the probe reads them.
test('an authored frame character is kept in a style value and probed as emitted', () => {
  for (const c of ['\u0002', '', '']) {
    assert.equal(render(`*x*{style="ur${c}l(a)"}\n`), `<p><strong style="ur${c}l(a)">x</strong></p>`)
  }
})

test('the scheme probe strips C1 controls and U+0085', () => {
  for (const c of ['\u0080', '\u0085', '\u009F']) {
    assert.equal(render(`*x*{k="${c}javascript:x"}\n`), '<p><strong k="">x</strong></p>')
    assert.equal(render(`*x*{srcset="a 1x,${c}javascript:x 2x"}\n`), '<p><strong srcset="">x</strong></p>')
  }
  for (const c of ['\u0080', '\u009F']) assert.equal(render(`[x](java${c}script:a)\n`), '<p><a href="">x</a></p>')
})
