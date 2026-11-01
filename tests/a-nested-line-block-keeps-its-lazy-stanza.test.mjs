import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).trim()

test('a line block in a quoted item keeps its lazy stanza after an attribute-shaped payload', () => {
  assert.equal(html('- > ::: |\n  > {.k}\nb\n'), [
    '<ul>',
    '  <li>',
    '    <blockquote>',
    '      <div class="line-block">',
    '        <p>{.k}<br>',
    'b</p>',
    '      </div>',
    '    </blockquote>',
    '  </li>',
    '</ul>',
  ].join('\n'))
})

test('a line block in nested descriptions in a quote keeps the same lazy stanza', () => {
  assert.equal(html('> :: t\n> : :: u\n>   : ::: |\n>     {.k}\nb\n'), [
    '<blockquote>',
    '  <dl>',
    '    <dt>t</dt>',
    '    <dd>',
    '      <dl>',
    '        <dt>u</dt>',
    '        <dd>',
    '          <div class="line-block">',
    '            <p>{.k}<br>',
    'b</p>',
    '          </div>',
    '        </dd>',
    '      </dl>',
    '    </dd>',
    '  </dl>',
    '</blockquote>',
  ].join('\n'))
})

test('the lazy claim ends at a matching line-block closer', () => {
  assert.equal(html('- > ::: |\n  > {.k}\n  > :::\nb\n'), [
    '<ul>',
    '  <li>',
    '    <blockquote>',
    '      <div class="line-block">',
    '        <p>{.k}</p>',
    '      </div>',
    '    </blockquote>',
    '  </li>',
    '</ul>',
    '<p>b</p>',
  ].join('\n'))
})
