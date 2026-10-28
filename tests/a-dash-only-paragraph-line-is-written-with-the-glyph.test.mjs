import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { carveToCarve, carveToHtml } from '@markup-carve/carve'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const fixture = JSON.parse(readFileSync(new URL('./fixtures/em-dash-line-fmt.json', import.meta.url), 'utf8'))
const model = source => renderDoc(parse(source))
const hrs = html => html.split('<hr>').length - 1

test('em-dash line fixture names its clause', () => {
  assert.equal(fixture.version, 1)
  assert.equal(fixture.clause, 'CARVE-P11-077')
  assert.equal(fixture.rows.length, 7)
})

for (const row of fixture.rows) {
  test(`${row.id}: fmt keeps the glyph line and its rendering`, () => {
    assert.equal(model(row.fmt), model(row.source))
    assert.equal(carveToHtml(row.fmt), model(row.source))
    assert.equal(carveToCarve(row.source), row.fmt)
    if (row.hyphenSpelling) {
      assert.equal(hrs(model(row.hyphenSpelling)), hrs(model(row.source)) + 1, 'the hyphen spelling opens a thematic break')
    }
  })
}

// Hyphen-run decomposition, PART 9 §8.
const glyphs = n => {
  if (n % 3 === 0) return '—'.repeat(n / 3)
  if (n % 2 === 0) return '–'.repeat(n / 2)
  return '—' + glyphs(n - 3)
}

const containers = [
  ['top', lines => lines.join('\n') + '\n'],
  ['quote', lines => lines.map(l => `> ${l}`).join('\n') + '\n'],
  ['nested quote', lines => lines.map(l => `> > ${l}`).join('\n') + '\n'],
  ['item', lines => lines.map((l, i) => (i ? '  ' : '- ') + l).join('\n') + '\n'],
  ['nested item', lines => '- a\n\n' + lines.map((l, i) => (i ? '    ' : '  - ') + l).join('\n') + '\n'],
  ['ordered item', lines => lines.map((l, i) => (i ? '   ' : '1. ') + l).join('\n') + '\n'],
  ['footnote', lines => 'x[^1]\n\n' + lines.map((l, i) => (i ? '  ' : '[^1]: ') + l).join('\n') + '\n'],
  ['description', lines => ':: t\n' + lines.map((l, i) => (i ? '  ' : ': ') + l).join('\n') + '\n'],
  ['admonition', lines => '::: note\n' + lines.join('\n') + '\n:::\n'],
  ['div', lines => '::: {.d}\n' + lines.join('\n') + '\n:::\n'],
]

test('987 variants: a dash-only paragraph line keeps its glyphs, a hyphen spelling would break it', () => {
  let count = 0
  for (const [name, wrap] of containers) {
    for (let n = 3; n <= 9; n++) {
      const glyph = glyphs(n)
      for (const at of [0, 1, 2]) {
        const lines = ['foo', 'bar']
        lines.splice(at, 0, glyph)
        const source = wrap(lines)
        const plain = wrap(['foo', 'z', 'bar'])
        const html = model(source)
        assert.equal(hrs(html), hrs(model(plain)), `${name} n=${n} at=${at}: glyph line stays text`)
        assert.ok(html.includes(glyph), `${name} n=${n} at=${at}: glyph rendered`)
        assert.equal(carveToHtml(source), html, `${name} n=${n} at=${at}: pinned JS agrees`)
        const fmt = carveToCarve(source)
        assert.equal(model(fmt), html, `${name} n=${n} at=${at}: fmt keeps the rendering`)
        assert.ok(fmt.split('\n').some(line => line.trimStart().endsWith(glyph) && !/-{3}/.test(line)), `${name} n=${n} at=${at}: fmt writes the glyph`)
        for (let indent = 0; indent <= 3; indent++) {
          if (at > 0) {
            const hyphen = [...lines]
            hyphen[at] = ' '.repeat(indent) + '-'.repeat(n)
            assert.equal(hrs(model(wrap(hyphen))), hrs(html) + 1, `${name} n=${n} at=${at} indent=${indent}: hyphens open a break`)
          }
          count++
        }
      }
      for (const run of [`a${'-'.repeat(n)}b`, `a ${'-'.repeat(n)} b`]) {
        const source = wrap(['foo', run, 'bar'])
        const fmt = carveToCarve(source)
        assert.equal(model(fmt), model(source), `${name} ${run}: keeps its rendering`)
        assert.ok(fmt.includes(run), `${name} ${run}: keeps the author's spelling`)
        count++
      }
    }
  }
  for (let n = 3; n <= 9; n++) {
    const source = `::: |\nfoo\n${'-'.repeat(n)}\n:::\n`
    assert.equal(hrs(model(source)), 0, `line block n=${n}: no break`)
    count++
  }
  assert.equal(count, 987)
})
