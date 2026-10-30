import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).replace(/\s*\n\s*/g, '')

const pinned = [
  ['a delimiter row consumes its row attributes (G1)', '|a|\n|---|{.r}\n|b|\n', '<table><thead><tr><th scope="col">a</th></tr></thead><tbody><tr><td>b</td></tr></tbody></table>'],
  ['a continuation fragment reads no marker (G2)', '| a | b |\n+ < | ^ |\n', '<table><tbody><tr><td>a &lt;</td><td>b ^</td></tr></tbody></table>'],
  ['an admonition opener takes a space run (G3)', ':::  note "T"\nx\n:::\n', '<aside class="admonition note" aria-labelledby="adm-1"><p class="admonition-title" id="adm-1">T</p><p>x</p></aside>'],
  ['a line block opener takes a space run (G3)', ':::  |\nx\n:::\n', '<div class="line-block"><p>x</p></div>'],
  ['a hard-break block opener takes a space run (G3)', ':::  \\\nx\n:::\n', '<div class="hardbreaks"><p>x</p></div>'],
  ['a quote block opener takes a space run (G3)', ':::  >\nx\n:::\n', '<blockquote><p>x</p></blockquote>'],
  ['a figure group opener takes a space run (G3)', ':::  figure\nx\n:::\n', '<figure class="carve-figure-group"><p>x</p></figure>'],
  ['a line block may be empty (G4)', '::: |\n:::\n', '<div class="line-block"></div>'],
  ['stanzas may stand two blanks apart (G4)', '::: |\na\n\n\nb\n:::\n', '<div class="line-block"><p>a</p><p>b</p></div>'],
  ['a span may be empty (G5)', '[]{.c}\n', '<p><span class="c"></span></p>'],
  ['a substitution may have an empty replacement (G5)', '{~a~>~}\n', '<p><del>a</del><ins></ins></p>'],
  ['a substitution may have an empty source (G5)', '{~~>b~}\n', '<p><del></del><ins>b</ins></p>'],
  ['an item takes the empty block (G6)', '-{} t\n', '<ul><li>t</li></ul>'],
  ['an item takes the padded empty block (G6)', '-{ } t\n', '<ul><li>t</li></ul>'],
  ['=> opens no highlight (G7)', '=>y=\n', '<p>=&gt;y=</p>'],
  ['a bare path has no leading quote (G8)', '{{ "a.txt @code }}\n', '<p>{{ “a.txt <span class="mention"><strong>@code</strong></span> }}</p>'],
]

for (const [name, source, expected] of pinned) {
  test(name, () => assert.equal(html(source), expected))
}
