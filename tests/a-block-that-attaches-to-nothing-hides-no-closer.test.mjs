import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

// A block behind a delimiter that closes nothing is text in every reading, so
// its closer is reachable before a guard-blocked span's block (carve#3933).
const html = (src) => renderDoc(parse(src + '\n')).trim()

test('the guard closes inside the unattached block', () => {
  assert.equal(html('_*a*{t="_"} b/{t=c_}'), '<p><u><strong t="_">a</strong> b/{t=c</u>}</p>')
})

for (const [guard, kids] of [['_', ['/', '*', '~', '=']], ['/', ['_']]]) for (const kid of kids) {
  for (const lead of ['b/', '//b/', 'b*', 'b~', 'b=', 'x']) {
    if (lead.includes(guard)) continue
    const src = `${guard}${kid}a${kid}{t="${guard}"} ${lead}{t=c${guard}}`
    test(`attaches: ${src}`, () => {
      const out = html(src)
      assert.ok(out.includes(` t="${guard}">a</`), `${src} -> ${out}`)
      assert.ok(out.endsWith(`{t=c</${guard === '_' ? 'u' : 'em'}>}</p>`), `${src} -> ${out}`)
    })
  }
}

test('a block whose span the guard blocks still hands out its closer when nothing else can', () => {
  assert.equal(html('_*a*{t="_"}'), '<p><u><strong>a</strong>{t=“</u>”}</p>')
})
