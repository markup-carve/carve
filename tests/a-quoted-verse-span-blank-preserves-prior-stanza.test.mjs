import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = source => renderDoc(parse(source))

test('an unclosed verse span keeps the stanza across a marked blank (carve#5263)', () => {
  const source = '> :: t\n> : ::: |\n>   x\n>   %%%\n>\nb\n'
  assert.equal(html(source), '<blockquote>\n  <dl>\n    <dt>t</dt>\n    <dd>\n      <div class="line-block">\n        <p>x<br>\nb</p>\n      </div>\n    </dd>\n  </dl>\n</blockquote>')
})

test('an empty stanza still cannot claim the next line', () => {
  const source = '> :: t\n> : ::: |\n>   %%%\n>\nb\n'
  assert.match(html(source), /<\/blockquote>\n<p>b<\/p>$/)
})

test('1,000 quoted description variants preserve a prior stanza', () => {
  let checked = 0
  for (const depth of [1, 2]) {
    const mark = '> '.repeat(depth)
    for (const blank of ['', ' ', '  ', '   ', '    ']) {
      for (let n = 0; n < 100; n++) {
        const source = `${mark}:: t${n}\n${mark}: ::: |\n${mark}  x${n}\n${mark}  %%%\n${mark.trimEnd()}${blank}\nb${n}\n`
        const result = html(source)
        assert.ok(result.includes(`<p>x${n}<br>\nb${n}</p>`), source)
        checked++
      }
    }
  }
  assert.equal(checked, 1000)
})
