import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).trim()

test('a quoted line block in a nested item keeps its lazy stanza after a definition-shaped payload', () => {
  assert.equal(html('- - > ::: |\n    > [x]: /u\nb\n'), [
    '<ul>',
    '  <li>',
    '    <ul>',
    '      <li>',
    '        <blockquote>',
    '          <div class="line-block">',
    '            <p>[x]: /u<br>',
    'b</p>',
    '          </div>',
    '        </blockquote>',
    '      </li>',
    '    </ul>',
    '  </li>',
    '</ul>',
  ].join('\n'))
})

test('every later lazy line stays in the stanza', () => {
  assert.equal(html('- > ::: |\n  > {.k}\nb\nc\n'), [
    '<ul>',
    '  <li>',
    '    <blockquote>',
    '      <div class="line-block">',
    '        <p>{.k}<br>',
    'b<br>',
    'c</p>',
    '      </div>',
    '    </blockquote>',
    '  </li>',
    '</ul>',
  ].join('\n'))
})

test('a fence-shaped payload in a description in a nested item opens no fence', () => {
  assert.equal(html('- - :: t\n    : ::: |\n      ~~~\nb\n'), [
    '<ul>',
    '  <li>',
    '    <ul>',
    '      <li>',
    '        <dl>',
    '          <dt>t</dt>',
    '          <dd>',
    '            <div class="line-block">',
    '              <p>~~~<br>',
    'b</p>',
    '            </div>',
    '          </dd>',
    '        </dl>',
    '      </li>',
    '    </ul>',
    '  </li>',
    '</ul>',
  ].join('\n'))
})

test('the same payload in a description in a quoted item opens no fence', () => {
  assert.equal(html('> - :: t\n>   : ::: |\n>     ~~~\nb\n'), [
    '<blockquote>',
    '  <ul>',
    '    <li>',
    '      <dl>',
    '        <dt>t</dt>',
    '        <dd>',
    '          <div class="line-block">',
    '            <p>~~~<br>',
    'b</p>',
    '          </div>',
    '        </dd>',
    '      </dl>',
    '    </li>',
    '  </ul>',
    '</blockquote>',
  ].join('\n'))
})

test('a blank line still ends the nested stanza', () => {
  assert.equal(html('- - > ::: |\n    > {.k}\n\nb\n'), [
    '<ul>',
    '  <li>',
    '    <ul>',
    '      <li>',
    '        <blockquote>',
    '          <div class="line-block">',
    '            <p>{.k}</p>',
    '          </div>',
    '        </blockquote>',
    '      </li>',
    '    </ul>',
    '  </li>',
    '</ul>',
    '<p>b</p>',
  ].join('\n'))
})
