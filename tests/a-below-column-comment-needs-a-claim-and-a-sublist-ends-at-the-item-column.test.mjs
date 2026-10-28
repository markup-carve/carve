import test from 'node:test'
import assert from 'node:assert/strict'
import { parse, layoutWork, resetLayoutWork } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const normalize = (html) => html.replace(/>\s+</g, '><').replace(/\s+/g, ' ').trim()
const html = (source) => normalize(renderDoc(parse(source)))

for (const [name, source, expected] of [
  ['closed container', '- ::: box\n  :::\n %% c\n  text\n', '<ul><li><div class="box"></div></li></ul><p>text</p>'],
  ['heading', '- # h\n %% c\n  text\n', '<ul><li><h1 id="h">h</h1></li></ul><p>text</p>'],
  ['closed marker-line code', '- ```\n  x\n  ```\n %% c\n  text\n', '<ul><li><pre><code>x\n</code></pre></li></ul><p>text</p>'],
  ['open paragraph control', '- a\n %% c\n  text\n', '<ul><li>a</li></ul><p>text</p>'],
  ['blank control', '- a\n\n %% c\n  text\n', '<ul><li>a</li></ul><p>text</p>'],
  ['paragraph ends sublist', '- outer\n  - para\n\n  text\n\n    ```\n', '<ul><li><p>outer</p><ul><li>para</li></ul><p>text</p><pre><code></code></pre></li></ul>'],
  ['quote ends sublist', '- outer\n  - para\n  > q\n\n    ```\n', '<ul><li>outer <ul><li>para</li></ul><blockquote><p>q</p></blockquote><pre><code></code></pre></li></ul>'],
  ['blank before quote ends sublist', '- outer\n  - para\n\n  > q\n\n    ```\n', '<ul><li>outer <ul><li>para</li></ul><blockquote><p>q</p></blockquote><pre><code></code></pre></li></ul>'],
]) {
  test(name, () => assert.equal(html(source), normalize(expected)))
}

for (const [name, head] of [['footnote', '[^n]: x\n'], ['description', ':: term\n:  x\n']]) {
  test(`${name} retention grows linearly`, () => {
    const source = (n) => head + ' %% c\n x\n'.repeat(n)
    const small = source(1000)
    const large = source(4000)
    const work = (input) => {
      resetLayoutWork()
      parse(input)
      return layoutWork.commentTail
    }
    const baseline = work(small)
    const scaled = work(large)
    assert.ok(baseline > 0, `${name}: the comment tail was never read`)
    assert.ok(scaled / baseline < 6, `${name}: 1000=${baseline} lines, 4000=${scaled} lines`)
  })
}
