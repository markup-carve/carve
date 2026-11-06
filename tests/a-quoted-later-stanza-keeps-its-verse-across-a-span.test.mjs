import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = source => renderDoc(parse(source))

test('a lazy line after a span folds into a quoted second stanza (carve#5272)', () => {
  const source = '> :: t\n> : ::: |\n>   x\n>\n>   y\n>   %%%\nb\n'
  assert.equal(html(source), '<blockquote>\n  <dl>\n    <dt>t</dt>\n    <dd>\n      <div class="line-block">\n        <p>x</p>\n        <p>y<br>\nb</p>\n      </div>\n    </dd>\n  </dl>\n</blockquote>')
})

test('an empty second stanza still cannot claim the next line', () => {
  for (const mark of ['> ', '> > ']) {
    const source = `${mark}:: t\n${mark}: ::: |\n${mark}  x\n${mark.trimEnd()}\n${mark}  %%%\nb\n`
    assert.match(html(source), /<\/blockquote>\n<p>b<\/p>$/, source)
  }
})

test('1,000 quoted later-stanza variants fold the lazy line', () => {
  let checked = 0
  for (const depth of [1, 2]) {
    const mark = '> '.repeat(depth)
    for (const host of [[':: t', ': ::: |'], ['- ::: |']]) {
      for (const span of ['%%%', '%%%%', '%%% c', '%%%\n  hid', '%%%\n  %%%']) {
        for (let n = 0; n < 50; n++) {
          const rows = [...host, `  x${n}`, '', `  y${n}`, ...span.split('\n').map(r => r.startsWith('  ') ? r : `  ${r}`)]
          const source = rows.map(r => r === '' ? mark.trimEnd() : mark + r).join('\n') + `\nb${n}\n`
          assert.ok(html(source).includes(`<p>y${n}<br>\nb${n}</p>`), source)
          checked++
        }
      }
    }
  }
  assert.equal(checked, 1000)
})
