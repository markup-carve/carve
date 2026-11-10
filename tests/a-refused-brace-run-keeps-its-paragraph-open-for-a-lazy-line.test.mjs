import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

// CARVE-P2-035, carve#5830: a refused opener claims no follower.
const render = lines => renderDoc(parse(lines.join('\n') + '\n')).trim()
const oracle = lines => render(lines.join('\n').replace('{', '\\{').split('\n'))

const hosts = {
  'list item': body => ['- ' + body[0], ...body.slice(1).map(line => '  ' + line)],
  'nested item': body => ['- p', '  - ' + body[0], ...body.slice(1).map(line => '    ' + line)],
  quote: body => body.map(line => '> ' + line),
  'nested quote': body => body.map(line => '> > ' + line),
  'item in a quote': body => ['> - ' + body[0], ...body.slice(1).map(line => '>   ' + line)],
  'quote in an item': body => ['- > ' + body[0], ...body.slice(1).map(line => '  > ' + line)],
  description: body => [':: t', ': ' + body[0], ...body.slice(1).map(line => '  ' + line)],
  footnote: body => ['x[^f]', '', '[^f]: ' + body[0], ...body.slice(1).map(line => '  ' + line)],
}
const followers = [['# c'], ['> q'], ['- x'], ['```', 'code', '```'], ['::: d'], ['{y}'], ['%% c', '# c']]

for (const [name, host] of Object.entries(hosts)) {
  for (const lead of [[], ['a']]) {
    for (const follower of followers) {
      const body = [...lead, '{x', 'y}', ...follower]
      test(`${name}: ${JSON.stringify(follower[0])} follows a literal brace opener${lead.length ? ' after a lead' : ''}`, () => {
        const source = [...host(body), 'more']
        assert.equal(render(source), oracle(source))
      })
    }
  }
}

for (const source of [
  ['- a', '+', '{x', 'y}', '  # c', 'more'],
  ['- a', '  {x', '  y}', '  # c', 'more'],
  ['> a', '> {x', '> y}', '> # c', 'more'],
  ['{x', 'y}', '%% c', '# d', 'more'],
]) test('carve#5191 follower is read normally', () => assert.equal(render(source), oracle(source)))
