/*
 * The oracle never ships an internal frame into its output.
 *
 * scripts/spec/layout.mjs passes a lazy line to the container's own parse with
 * a LAZY frame (U+0000 'L' U+0000) around it, and resolution uses U+E000 /
 * U+E001 / U+0002 the same way. Those are pipeline state, not text: any of them
 * reaching rendered HTML corrupts the ground truth every engine is measured
 * against, and would be a sentinel-injection hazard in a shipping engine.
 *
 * scripts/formal-core-check.mjs already asserts this - over the CORPUS. That
 * check could not fail for the shape that broke it: `- ``` ` opens a fence on
 * the marker line and a following line below the item's content column arrives
 * framed, and no corpus input has that shape, so the frame rode into the code
 * text unnoticed. A guard whose inputs are a fixed list only guards the list.
 *
 * So this file GENERATES its inputs: every construct that keeps a verbatim
 * body, opened at every column a container can put it at. It is deliberately
 * indifferent to what the right rendering is - several of these shapes are
 * genuinely undecided across the engines - and asserts only that the answer
 * contains no framing.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse, Refuse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const SENTINELS = /[\u0000\u0002\uE000\uE001]/

// Bodies that are kept VERBATIM: a frame in one of these reaches the reader as
// text rather than being consumed by a paragraph builder.
const VERBATIM = [
  { name: 'code fence', open: '```', close: '```', body: ['x'] },
  { name: 'raw block', open: '```=html', close: '```', body: ['<b>x</b>'] },
  { name: 'line block', open: '::: |', close: ':::', body: ['verse'] },
  { name: 'comment fence', open: '%%%', close: '%%%', body: ['note'] },
]

// Where the construct is opened, and where its body and closer then sit. The
// interesting axis is the CONTENT COLUMN of the enclosing item: at it, below
// it, and at column 0 are three different parses, and the framing only appears
// on the ones that fold.
const CONTAINERS = [
  { name: 'top level', prefix: '', indents: ['', ' ', '  '] },
  { name: 'list item, marker line', prefix: '- ', indents: ['', ' ', '  ', '   '] },
  { name: 'list item, own line', prefix: '-\n  ', indents: ['', ' ', '  ', '   '] },
  { name: 'block quote', prefix: '> ', indents: ['', ' ', '  '] },
]

for (const c of CONTAINERS) {
  for (const v of VERBATIM) {
    for (const indent of c.indents) {
      const src =
        c.prefix +
        v.open +
        '\n' +
        v.body.map((b) => indent + b).join('\n') +
        '\n' +
        indent +
        v.close +
        '\ntail\n'
      test(`no framing leaks: ${v.name} in ${c.name}, body at column ${indent.length}`, () => {
        let html
        try {
          html = renderDoc(parse(src))
        } catch (e) {
          // Out of the executable subset is fine; a REFUSAL ships nothing.
          if (e instanceof Refuse || e.refuse) return
          throw e
        }
        assert.ok(
          !SENTINELS.test(html),
          `framing reached the output for ${JSON.stringify(src)}: ${JSON.stringify(html)}`,
        )
      })
    }
  }
}

/*
 * A HEADING IS STORED AS RENDERED HTML BEFORE ANY RESOLUTION PASS RUNS, so what
 * a crossref clones can still hold a frame. Only the crossref frame was being
 * stripped from the clone, and a heading holding a footnote reference or an
 * inline note put its framing into the reader's HTML as the text `fn:1` and
 * `note:...` (markup-carve/carve#1199).
 *
 * The generator above cannot reach this: it varies verbatim BODIES and the
 * columns they sit at, and this shape is an inline construct in a heading that
 * a later crossref names. So the inputs are written out.
 *
 * Deliberately indifferent to what the label should read, which is a separate
 * question (the engines render the noteref's source there, the oracle drops the
 * run as it already did for a nested crossref). The assertion is only that no
 * framing survives, which is true whichever way that lands.
 */
const CLONED = [
  { name: 'a footnote reference', text: 'a [^1] b', tail: '\n[^1]: n\n' },
  { name: 'an inline note', text: 'a ^[n] b', tail: '' },
  { name: 'a crossref', text: 'a </#h> b', tail: '' },
  { name: 'a reference link', text: 'a [t][r] b', tail: '\n[r]: /u\n' },
  { name: 'an image reference', text: 'a ![z][r] b', tail: '\n[r]: /i.png\n' },
  { name: 'an inline note holding a crossref', text: 'a ^[</#h>] b', tail: '' },
]

for (const c of CLONED) {
  const src = `# ${c.text}\n\n# h\n\nsee </#a-b>\n${c.tail}`
  test(`no framing leaks: a crossref clones a heading holding ${c.name}`, () => {
    let html
    try {
      html = renderDoc(parse(src))
    } catch (e) {
      if (e instanceof Refuse || e.refuse) return
      throw e
    }
    assert.ok(
      !SENTINELS.test(html),
      `framing reached the output for ${JSON.stringify(src)}: ${JSON.stringify(html)}`,
    )
  })
}
