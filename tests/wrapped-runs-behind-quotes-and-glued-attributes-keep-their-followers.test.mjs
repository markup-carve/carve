import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const render = (source) => renderDoc(parse(source)).trim()

// carve#5883: a valid wrapped run behind quote prefixes is one attribute line and leaves no paragraph.
const quotedItemThenTail = '<ul>\n  <li>\n    <blockquote>\n      <ul>\n        <li>b</li>\n      </ul>\n    </blockquote>\n  </li>\n</ul>\n<p>tail</p>'
const emptyQuotedItemThenPlain = '<ul>\n  <li>\n    <blockquote>\n      <ul>\n        <li></li>\n      </ul>\n    </blockquote>\n  </li>\n</ul>\n<p>plain</p>'
// carve#5882: a run refused at its written `{` behind glued attributes is paragraph text a lazy line continues.
const refusedInQuotedItem = '<blockquote>\n  <ul>\n    <li class="a">{.x\n.y}\nplain</li>\n  </ul>\n</blockquote>'
const validInQuotedItem = '<blockquote>\n  <ul>\n    <li class="a"></li>\n  </ul>\n</blockquote>\n<p>plain</p>'
const refusedInNestedItem = '<ul>\n  <li>\n    <ul>\n      <li class="a">{.x\n.y}\nplain</li>\n    </ul>\n  </li>\n</ul>'

for (const [name, source, html] of [
  ['quoted item in an item: wrapped run', '- > - b\n  > {.x\n  >  .y}\ntail\n', quotedItemThenTail],
  ['quoted item in an item: single-line run', '- > - b\n  > {.x}\ntail\n', quotedItemThenTail],
  ['quoted item in an item: id opener two columns in', '- > - b\n  >   {#i\n  >    .y}\ntail\n', quotedItemThenTail],
  ['quote then marker on the item marker line', '- > - {.x\n  >    .y}\nplain\n', emptyQuotedItemThenPlain],
  ['glued attributes in a quote: continuation at the content column', '> -{.a} {.x\n>    .y}\nplain\n', refusedInQuotedItem],
  ['glued attributes in a quote: continuation under the brace', '> -{.a} {.x\n>       .y}\nplain\n', refusedInQuotedItem],
  ['glued attributes in a quote: continuation past the brace', '> -{.a} {.x\n>        .y}\nplain\n', validInQuotedItem],
  ['glued attributes on a nested marker line', '- -{.a} {.x\n     .y}\nplain\n', refusedInNestedItem],
]) {
  test(name, () => assert.equal(render(source), html))
}
