import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).replace(/\s+/g, ' ').replace(/ ?(<[^>]+>) ?/g, '$1')

const cases = [
  [
    'a closed fence below an open sublist opens in the outer item',
    '- a\n    - child\n    ```\n    code\n    ```\nafter\n',
    '<ul><li>a<ul><li>child</li></ul><pre><code>code</code></pre></li></ul><p>after</p>',
    'code\n',
  ],
  [
    'a quoted closed fence below an open sublist opens in the outer item',
    '> - a\n>     - child\n>     ```\n>     code\n>     ```\nafter\n',
    '<blockquote><ul><li>a<ul><li>child</li></ul><pre><code>code</code></pre></li></ul></blockquote><p>after</p>',
    'code\n',
  ],
  [
    'an unclosed fence below an open sublist stays paragraph text',
    '- a\n    - child\n    ```\n    code\nafter\n',
    '<ul><li>a<ul><li>child<code>code after</code></li></ul></li></ul>',
  ],
  [
    'a fence after a closed nested line block opens in its box',
    '> - ::: box\n>   - ::: |\n>     ```\n>     :::\n>    ```\n>    :::bad\n>    :::\n- tail\n',
    '<blockquote><ul><li><div class="box"><ul><li><div class="line-block"><p><code></code></p></div></li></ul><pre><code>:::bad</code></pre></div></li></ul></blockquote><ul><li>tail</li></ul>',
    ':::bad\n',
  ],
  [
    'a closed payload fence stays with the line block',
    '> 1. ::: box\n>    - ::: |\n>      ```\n>      x\n>      ```\n>      :::\n>     ```\n>     - x\n> ```\n',
    '<blockquote><ol><li><div class="box"><ul><li><div class="line-block"><p><code>x</code></p></div></li></ul><pre><code>- x</code></pre></div></li></ol><pre><code></code></pre></blockquote>',
  ],
  [
    'a footnote definition past a box column is hoisted',
    '- ::: box\n    [^n]: note\n  :::\n\nref[^n]\n',
    '<ul><li><div class="box"></div></li></ul><p>ref<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p><section role="doc-endnotes" aria-label="Footnotes"><hr><ol><li id="fn1"><p>note<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p></li></ol></section>',
  ],
  [
    'a fence after a wider nested item opens in its box',
    '> - ::: box\n>   -   ::: |\n>       ```\n>       :::\n>     ```\n>     :::\n>     :::bad\n>     :::\n- tail\n',
    '<blockquote><ul><li><div class="box"><ul><li><div class="line-block"><p><code></code></p></div></li></ul><pre><code></code></pre></div>:::bad :::</li></ul></blockquote><ul><li>tail</li></ul>',
    '',
  ],
  [
    'unclosed fences at block start leave the quote after their hosts close',
    '> - a\n>     - child\n>     ```\n>\n>       ```\n>   ~~~\nafter\n',
    '<blockquote><ul><li>a<ul><li>child<code></code><pre><code></code></pre></li></ul><pre><code></code></pre></li></ul></blockquote><p>after</p>',
  ],
  [
    'a box column closer ends a fence opened after a closed line block',
    '- ::: box\n  - ::: |\n    x\n    :::\n   ```\n  :::\n',
    '<ul><li><div class="box"><ul><li><div class="line-block"><p>x</p></div></li></ul><pre><code></code></pre></div></li></ul>',
  ],
  [
    'a footnote at the box column stays hoisted',
    '- ::: box\n  [^n]: note\n  :::\n\nref[^n]\n',
    '<ul><li><div class="box"></div></li></ul><p>ref<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p><section role="doc-endnotes" aria-label="Footnotes"><hr><ol><li id="fn1"><p>note<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p></li></ol></section>',
  ],
  [
    'an open child paragraph keeps a lazy line',
    '> - a\n>     - child\nafter\n',
    '<blockquote><ul><li>a<ul><li>child after</li></ul></li></ul></blockquote>',
  ],
  [
    'a bare closer past a box column closes the box',
    '- ::: box\n  text\n   :::\nafter\n',
    '<ul><li><div class="box"><p>text</p></div></li></ul><p>after</p>',
  ],
  [
    'an unclosed fence at a note block start ends at its closer',
    '::: note\n```\nx\n:::\nafter\n',
    '<aside class="admonition note" aria-label="Note"><pre><code>x</code></pre></aside><p>after</p>',
  ],
  [
    'an unclosed fence at a box block start ends at its closer',
    '- ::: box\n  ```\n  x\n  :::\nafter\n',
    '<ul><li><div class="box"><pre><code>x</code></pre></div></li></ul><p>after</p>',
  ],
  [
    'a line block payload has no closer after its list ends',
    '- ::: |\n  ```\n  :::\n\n  y\n- b\n',
    '<ul><li><div class="line-block"><p><code></code></p></div><p>y</p></li><li><p>b</p></li></ul>',
  ],
  [
    'a later fence cannot close a prior list payload',
    '- ::: |\n  ```\n  :::\n\n  y\n- b\n\npara\n\n  ```\n',
    '<ul><li><div class="line-block"><p><code></code></p></div><p>y</p></li><li><p>b</p></li></ul><p>para</p><pre><code></code></pre>',
  ],
  [
    'a bare closer beyond the box column ends the unclosed code and the box',
    '- ::: box\n   ```\n   :::bad\n   :::\n',
    '<ul><li><div class="box"><pre><code>:::bad</code></pre></div></li></ul>',
    ':::bad\n',
  ],
  [
    'a quoted bare closer beyond the box column ends the unclosed code and the box',
    '> - ::: box\n>    ```\n>    :::bad\n>    :::\n',
    '<blockquote><ul><li><div class="box"><pre><code>:::bad</code></pre></div></li></ul></blockquote>',
    ':::bad\n',
  ],
  [
    'a bare closer at the box column closes the box',
    '- ::: box\n  ```\n  x\n  :::\nafter\n',
    '<ul><li><div class="box"><pre><code>x</code></pre></div></li></ul><p>after</p>',
    'x\n',
  ],
  [
    'a deeper bare run closes the box and its unclosed code',
    '- ::: box\n    ```\n    :::\n  :::\n',
    '<ul><li><div class="box"><pre><code></code></pre></div><div></div></li></ul>',
    '',
  ],
]

for (const [name, source, expected, codeText] of cases) {
  test(name, () => {
    assert.equal(html(source), expected)
    if (codeText !== undefined) assert.ok(renderDoc(parse(source)).includes(`<pre><code>${codeText}</code></pre>`))
  })
}
