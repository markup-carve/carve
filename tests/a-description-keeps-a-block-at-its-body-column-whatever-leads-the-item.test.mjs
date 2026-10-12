import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).replace(/\s+/g, ' ').replace(/ ?(<[^>]+>) ?/g, '$1')
const quoted = (depth, lines) => lines.map((line) => ('> '.repeat(depth) + line).trimEnd()).join('\n') + '\n'
const withoutIntro = (out) => out.replace('<li><p>intro</p>', '<li>').replace('<li>intro', '<li>')

const blocks = {
  backtick: ['```', 'code', '```'],
  tilde: ['~~~', 'code', '~~~'],
  raw: ['``` =html', '<b>x</b>', '```'],
  heading: ['# h'],
  quote: ['> q'],
  note: ['::: note', 'n', ':::'],
  para: ['para'],
}
const closesParagraph = new Set(['backtick', 'tilde', 'raw', 'heading', 'note'])

// CARVE-P0-018, CARVE-P2-028: a term on the marker line sits at the item's
// content column, so its description has the same body column as when text
// leads the item, and the lead decides nothing (ruled on carve-php#3174).
for (const depth of [0, 1, 2]) for (const blanks of [0, 1]) for (const col of [2, 4, 5, 6]) {
  if (col === 2 && blanks === 0) continue
  for (const [kind, block] of Object.entries(blocks)) for (const tail of [false, true]) {
    const body = ['  : definition', ...Array(blanks).fill(''), ...block.map((line) => ' '.repeat(col) + line)]
    const after = tail ? 'after\n' : ''
    const termLed = quoted(depth, ['- :: term', ...body]) + after
    const introLed = quoted(depth, ['- intro', '  :: term', ...body]) + after
    const name = `depth ${depth}, ${blanks} blank, column ${col}, ${kind}, tail ${tail}`
    test(`a term-led item reads its description as a text-led one does: ${name}`, () => {
      assert.equal(html(termLed), withoutIntro(html(introLed)))
    })
    if (col >= 4 && kind !== 'para') {
      test(`the description keeps the block: ${name}`, () => {
        assert.match(html(termLed), /(<\/pre>|<\/h1>|<\/blockquote>|<\/aside>|<\/b>)<\/dd><\/dl>/)
        assert.doesNotMatch(html(termLed), /<\/dl>(<pre>|<h1|<blockquote>|<aside|<b>)/)
      })
    }
    // CARVE-P0-009: no paragraph open at the deepest frame, so no frame adopts it.
    if (tail && depth === 0 && col >= 4 && closesParagraph.has(kind)) {
      test(`the line below a closed block leaves the list: ${name}`, () => {
        assert.match(html(termLed), /<\/ul><p>after<\/p>$/)
        assert.match(html(introLed), /<\/ul><p>after<\/p>$/)
      })
    }
    if (tail && depth === 0 && col >= 4 && kind === 'para') {
      test(`the line below a description paragraph folds into it: ${name}`, () => {
        assert.match(html(termLed), /para after(<\/p>)?<\/dd>/)
      })
    }
  }
}

// CARVE-P0-009 for a quote the item holds: its last block answers.
for (const col of [2, 3, 4]) for (const lead of [[], ['q']]) {
  for (const [kind, block] of Object.entries(blocks)) {
    if (kind === 'quote') continue
    const source = ['- intro', ...[...lead, ...block].map((line) => ' '.repeat(col) + '> ' + line)].join('\n') + '\nafter\n'
    test(`the line below a quote in an item: column ${col}, lead ${lead.length}, ${kind}`, () => {
      const out = html(source)
      if (closesParagraph.has(kind)) assert.match(out, /<\/ul><p>after<\/p>$/)
      else assert.match(out, /after<\/p><\/blockquote><\/li><\/ul>$/)
    })
  }
}
