/*
 * cmark-gfm as an independent Markdown reader: the meaning oracle of the
 * converter corpus. The importers follow cmark-gfm where Markdown parsers
 * disagree (carve#2187), so this is the reader their output answers to.
 *
 * `gfm-wasm` is cmark-gfm 0.29.0.gfm.13 compiled to WebAssembly with the five
 * GitHub extensions attached (table, strikethrough, autolink, tagfilter,
 * tasklist). It renders in cmark-gfm's safe mode only, which replaces every
 * raw HTML node with a placeholder comment. The literal of each such node is
 * put back from commonmark.js, whose raw-HTML rules are CommonMark's; tagfilter
 * is applied to it the way cmark-gfm's unsafe renderer would.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { Parser } from 'commonmark'
import { init, render } from 'gfm-wasm'

await init(readFileSync(fileURLToPath(import.meta.resolve('gfm-wasm/wasm'))))

const RAW_HTML_OMITTED = '<!-- raw HTML omitted -->'
// GFM spec, "Disallowed Raw HTML (extension)".
const TAGFILTER = /<(?=\/?(?:title|textarea|style|xmp|iframe|noembed|noframes|script|plaintext)(?:[\s>]|\/>))/gi

const rawHtmlLiterals = (source) => {
  const literals = []
  const walker = new Parser().parse(source).walker()
  for (let event = walker.next(); event; event = walker.next()) {
    const { node, entering } = event
    if (entering && (node.type === 'html_block' || node.type === 'html_inline')) literals.push(node.literal)
  }
  return literals
}

export const cmarkGfmToHtml = (source) => {
  const parts = render(source).split(RAW_HTML_OMITTED)
  if (parts.length === 1) return parts[0]
  const literals = rawHtmlLiterals(source)
  if (literals.length !== parts.length - 1) {
    // Loud rather than approximate: the two readers disagree on what is raw HTML.
    throw new Error(`cmark-gfm omitted ${parts.length - 1} raw HTML node(s), commonmark.js found ${literals.length}`)
  }
  return parts.reduce((html, part, index) => html + literals[index - 1].replace(TAGFILTER, '&lt;') + part)
}
