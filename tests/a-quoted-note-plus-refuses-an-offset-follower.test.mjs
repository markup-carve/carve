import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source))

for (const depth of [1, 2, 3]) {
  const prefix = '> '.repeat(depth)
  for (const extra of [1]) {
    for (const first of ['{#i', 'ordinary', '`code`']) {
      test(`quoted note at depth ${depth} refuses a paragraph ${extra} column(s) past its marker: ${first}`, () => {
        const source = `${prefix}[^a]: +\n${prefix}${' '.repeat(extra)}${first}\n\nsee[^a]\n`
        const output = html(source)
        const beforeNotes = output.slice(0, output.indexOf('<section role="doc-endnotes"'))
        const note = output.slice(output.indexOf('<li id="fn1">'))
        assert.match(beforeNotes, /<blockquote>/)
        assert.ok(beforeNotes.includes(first === '{#i' ? '#i' : first === '`code`' ? '<code>code</code>' : first), source)
        assert.ok(!note.includes(first === '{#i' ? '#i' : first === '`code`' ? '<code>code</code>' : first), source)
      })
    }
  }
}

test('an offset brace run and its lazy continuation stay in the deepest quote', () => {
  const output = html('> > [^a]: +\n> >  {#i\n  .y}\n\nsee[^a]\n')
  assert.match(output, /<blockquote><p>\{<span class="tag"><strong>#i<\/strong><\/span>\n\.y\}<\/p><\/blockquote>/)
  assert.doesNotMatch(output.slice(output.indexOf('<li id="fn1">')), /#i|\.y\}/)
})
