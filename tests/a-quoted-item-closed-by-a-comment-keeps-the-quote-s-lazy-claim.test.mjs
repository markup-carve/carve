// The quote's lazy check follows the walk when a comment closes a quoted item (carve#5006, carve#5007).
import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const normalize = (html) => html.replace(/>\s+</g, '><').replace(/\s+/g, ' ').trim()
const html = (source) => normalize(renderDoc(parse(source)))
const fence = '```'

for (const [name, source, expected] of [
  // An erased comment takes its `>` with it (carve#5129).
  ['comment ends the item code fence', `> - ${fence}\n> %% c\n>   x\n- t\n`,
    '<blockquote><ul><li><pre><code>x </code></pre></li></ul></blockquote><ul><li>t</li></ul>'],
  ['closed span ends the item code fence', `> - ${fence}\n> %%%\n> %%%\n>   x\n1. t\n`,
    '<blockquote><ul><li><pre><code></code></pre></li></ul><p>x 1. t</p></blockquote>'],
  ['comment ends the item line block', '> - ::: |\n> %% c\n>   x\n- t\n',
    '<blockquote><ul><li><div class="line-block"><p>x</p></div></li></ul></blockquote><ul><li>t</li></ul>'],
  ['second span after a line-block item', '> - ::: |\n> %%%\n> %%%\n> %%%\n> m\nTAILX\n',
    '<blockquote><ul><li><div class="line-block"></div></li></ul></blockquote><p>TAILX</p>'],
  ['second span after a numbered line-block item', '> 10. ::: |\n> %%%\n> %%%\n> %%%\n> m\nTAILX\n',
    '<blockquote><ol start="10"><li><div class="line-block"></div></li></ol></blockquote><p>TAILX</p>'],
  ['indented closer of a quote-level span', '> - ::: |\n> %%%\n>   %%%\n>   x\nTAILX\n',
    '<blockquote><ul><li><div class="line-block"></div></li></ul><p>x TAILX</p></blockquote>'],
  ['item span ended by a line below the column', '> - a\n>   %%%\n> x\nTAILX\n',
    '<blockquote><ul><li>a</li></ul><p>x TAILX</p></blockquote>'],
  ['heading control', `> - ${fence}\n> # h\n>   x\n- t\n`,
    '<blockquote><ul><li><pre><code></code></pre></li></ul><h1 id="h">h</h1><p>x - t</p></blockquote>'],
  ['open paragraph keeps the item', '> - a\n> %% c\n>   x\n- t\n',
    '<blockquote><ul><li>a x</li></ul></blockquote><ul><li>t</li></ul>'],
]) {
  test(name, () => assert.equal(html(source), normalize(expected)))
}
