import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = source => renderDoc(parse(source))
const shapes = ['```', '~~~', '# h', '| a |', 'x']
const hosts = {
  'quote depth 1': { head: '> ::: |\n', prefix: '> ' },
  'quote depth 2': { head: '> > ::: |\n', prefix: '> > ' },
  item: { head: '- a\n\n  ::: |\n', prefix: '  ' },
  'quoted item': { head: '> - a\n>\n>   ::: |\n', prefix: '>   ' },
}

for (const [host, { head, prefix }] of Object.entries(hosts)) {
  for (const shape of shapes) for (const following of [[], ['x']]) {
    test(`${host}: ${shape}, ${following.length ? 'followed by x' : 'last payload'}`, () => {
      const body = [shape, ...following].map(line => prefix + line + '\n').join('')
      const lazy = html(head + body + 'after\n')
      const explicit = html(head + body + prefix + 'after\n')
      assert.equal(lazy, explicit)
      assert.match(lazy, /after[^]*<\/div>/)
      assert.doesNotMatch(lazy, /<pre>|<h1|<table>/)
      if (host.includes('item')) {
        const plain = html(head + [ 'x', ...following ].map(line => prefix + line + '\n').join('') + 'after\n')
        assert.equal(lazy.slice(lazy.indexOf('</div>')), plain.slice(plain.indexOf('</div>')))
        assert.match(plain, /<br>\s*after<\/p>/)
      }
    })
  }
}
