import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const lines = [
  { name: 'footnote', line: '[^n]: a note', notes: ['n'] },
  { name: 'reference', line: '[r]: /url', links: ['r'] },
  { name: 'attribute', line: '{.marked}' },
  { name: 'abbreviation', line: '*[A]: expanded', prose: true },
]
const hosts = [
  {
    name: 'item follower',
    attrAttachesToTail: true,
    source: line => `- head\n${line}\ntail\n`,
    html: (line, prose) => prose
      ? `<ul>\n  <li>head\n${line}\ntail</li>\n</ul>`
      : '<ul>\n  <li>head</li>\n</ul>',
  },
  {
    name: 'description follower',
    attrAttachesToTail: true,
    source: line => `:: term\n:  head\n${line}\ntail\n`,
    html: (line, prose) => prose
      ? `<dl>\n  <dt>term</dt>\n  <dd>head\n${line}\ntail</dd>\n</dl>`
      : '<dl>\n  <dt>term</dt>\n  <dd>head</dd>\n</dl>',
  },
  {
    name: 'item marker content',
    source: line => `- ${line}\ntail\n`,
    html: (line, prose) => prose
      ? `<ul>\n  <li>${line}\ntail</li>\n</ul>`
      : '<ul>\n  <li></li>\n</ul>',
  },
]

for (const host of hosts) {
  for (const row of lines) {
    test(`${host.name}: ${row.name} preserves the boundary and registration`, () => {
      const doc = parse(host.source(row.line))
      const tail = row.prose ? '' :
        host.attrAttachesToTail && row.name === 'attribute'
          ? '\n<p class="marked">tail</p>' : '\n<p>tail</p>'
      assert.equal(renderDoc(doc), host.html(row.line, row.prose) + tail)
      assert.deepEqual([...doc.linkDefs.keys()], row.links ?? [])
      assert.deepEqual([...doc.footnoteDefs.keys()], row.notes ?? [])
      assert.deepEqual([...doc.abbrDefs.keys()], [])
    })
  }
}
