import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeStringify from 'rehype-stringify'
import remarkStringify from 'remark-stringify'
import * as commonmark from 'commonmark'
import * as djot from '@djot/djot'
import { load as loadAscii, getVersion as asciiVersion } from '@asciidoctor/core'
import { XMLParser } from 'fast-xml-parser'
import { parse, toAstJson } from '@markup-carve/carve'
import { context, document, coalesce, text, plain, parseHtml, fromHast, fromMdast, fromCommonmark, fromDjot, fromDocutils, fromMd4c } from './trees.mjs'

const md = unified().use(remarkParse).use(remarkGfm)
const htmlWriter = unified().use(remarkRehype).use(rehypeStringify)
const mdWriter = unified().use(remarkGfm).use(remarkStringify)
const hastWriter = unified().use(rehypeStringify)
const native = (command, args, input) => execFileSync(command, args, { input, encoding: 'utf8', timeout: 15000, maxBuffer: 8 * 1024 * 1024 })

export const toolNames = ['mdast', 'hast', 'commonmark', 'cmark', 'djot', 'docutils', 'asciidoctor', 'md4c']
export const nativeTools = ['cmark', 'docutils', 'md4c']

export async function readForeign(tool, source) {
  const ctx = context(tool)
  let ast, html, raw, version
  if (tool === 'mdast') {
    raw = md.parse(source)
    ast = fromMdast(raw, ctx)
    html = htmlWriter.stringify(await htmlWriter.run(raw))
  } else if (tool === 'hast') {
    raw = parseHtml(source)
    ast = fromHast(raw, ctx)
    html = hastWriter.stringify(raw)
  } else if (tool === 'commonmark') {
    raw = new commonmark.Parser().parse(source)
    ast = fromCommonmark(raw, ctx)
    html = new commonmark.HtmlRenderer().render(raw)
  } else if (tool === 'cmark') {
    const command = process.env.CARVE_CMARK ?? 'cmark'
    const xml = native(command, ['--to', 'xml'], source)
    raw = new XMLParser({ preserveOrder: true, ignoreAttributes: false, attributeNamePrefix: '', parseTagValue: false, trimValues: false }).parse(xml)
    ast = fromCommonmark(cmarkTree(raw), ctx)
    html = native(command, ['--to', 'html'], source)
    version = native(command, ['--version'], '').trim()
  } else if (tool === 'djot') {
    raw = djot.parse(source)
    ast = fromDjot(raw, ctx)
    html = djot.renderHTML(raw)
    version = djot.version
  } else if (tool === 'docutils') {
    const result = JSON.parse(native(process.env.CARVE_COMPAT_PYTHON ?? 'python3', [fileURLToPath(new URL('./docutils-driver.py', import.meta.url))], source))
    raw = result.tree
    ast = fromDocutils(raw, ctx)
    const full = unified().use((await import('rehype-parse')).default).parse(result.html)
    const find = (n, tag) => n.tagName === tag ? n : n.children?.map(c => find(c, tag)).find(Boolean)
    const body = find(full, 'main')
    if (!body) throw new Error('Docutils did not emit a main element')
    html = hastWriter.stringify({ type: 'root', children: body.children })
    version = result.version
  } else if (tool === 'asciidoctor') {
    raw = await loadAscii(source, { safe: 'secure', attributes: { 'sectids!': '', 'experimental!': '', showtitle: '' } })
    ast = await fromAscii(raw, ctx)
    html = await raw.convert()
    version = asciiVersion()
  } else if (tool === 'md4c') {
    const command = process.env.CARVE_MD4C_DRIVER ?? '.cache/compat/md4c-driver'
    raw = native(command, [], source).trim().split('\n').map(line => JSON.parse(line))
    ast = fromMd4c(raw, ctx)
    html = native(command, ['--html'], source)
    version = native(command, ['--version'], '').trim()
  } else throw new Error(`Unknown compatibility tool: ${tool}`)
  const packages = { mdast: 'remark-parse', hast: 'rehype-parse', commonmark: 'commonmark' }
  if (packages[tool]) version = JSON.parse(readFileSync(new URL(`../../node_modules/${packages[tool]}/package.json`, import.meta.url))).version
  ctx.note('', 'foreign-source-coordinates', 'normalized', 'Mapped tree has no Carve source positions and uses srcByteLength 0.')
  return { ast, html, diagnostics: ctx.diagnostics, version }
}

function cmarkTree(records) {
  const map = record => {
    const kind = Object.keys(record).find(k => k !== ':@')
    if (!kind || kind.startsWith('?')) return null
    if (kind === '#text') return { type: 'xml_formatting', literal: record[kind] }
    const attrs = record[':@'] ?? {}, fields = record[kind]
    const nodes = fields.map(map).filter(Boolean)
    const node = { type: kind, level: Number(attrs.level), listType: attrs.type, listStart: Number(attrs.start), listTight: attrs.tight === 'true', destination: attrs.destination, title: attrs.title, info: attrs.info }
    if (['text', 'code', 'code_block', 'html_inline', 'html_block'].includes(kind)) node.literal = nodes.map(plain).join('')
    else {
      const children = nodes.filter(n => n.type !== 'xml_formatting')
      node.firstChild = children[0]
      children.forEach((n, i) => { n.next = children[i + 1] })
    }
    return node
  }
  const root = records.map(map).find(n => n?.type === 'document')
  if (!root) throw new Error('cmark XML did not contain a document')
  return root
}

async function fromAscii(root, ctx) {
  const inline = async (html, path) => {
    ctx.note(path, 'inline-via-html', 'normalized', 'Asciidoctor exposes inline content through converted HTML.')
    const fragment = { type: 'root', children: [{ type: 'element', tagName: 'p', properties: {}, children: parseHtml(html).children }] }
    return fromHast(fragment, ctx, { generated: true }).children[0].children
  }
  const map = async (n, path) => {
    const type = n.getContext()
    if (n.getId?.()) ctx.note(`${path}/id`, 'unsupported-field', 'dropped', 'AsciiDoc block identifiers are outside this adapter subset.')
    if (n.getRoles?.().length) ctx.note(`${path}/roles`, 'unsupported-field', 'dropped', 'AsciiDoc block roles are outside this adapter subset.')
    if (!['document', 'section'].includes(type) && n.getTitle?.()) ctx.note(`${path}/title`, 'unsupported-field', 'dropped', 'AsciiDoc block titles are outside this adapter subset.')
    for (const key of ['attribution', 'citetitle']) if (n.getAttribute?.(key)) ctx.note(`${path}/${key}`, 'unsupported-field', 'dropped', `${key} is outside this adapter subset.`)
    const blocks = async () => coalesce((await Promise.all(n.getBlocks().map((c, i) => map(c, `${path}/blocks/${i}`)))).flat())
    if (type === 'document') return document([
      ...(n.hasHeader() && n.getDoctitle() ? [{ type: 'heading', level: 1, children: await inline(n.getDoctitle(), '/title') }] : []),
      ...await blocks(),
    ])
    if (type === 'section') {
      ctx.note(path, 'automatic-section', 'normalized', 'Flattened AsciiDoc section structure.')
      return [{ type: 'heading', level: n.getLevel() + 1, children: await inline(await n.getTitle(), `${path}/title`) }, ...await blocks()]
    }
    if (type === 'paragraph') return { type: 'paragraph', children: await inline(await n.getContent(), path) }
    if (type === 'quote') return { type: 'block_quote', children: await blocks() }
    if (type === 'listing' || type === 'literal') return { type: 'code_block', content: n.getSource() + '\n', ...(n.getAttribute('language') ? { lang: n.getAttribute('language') } : {}) }
    if (type === 'thematic_break') return { type: 'thematic_break' }
    if (type === 'ulist' || type === 'olist') {
      ctx.note(`${path}/tight`, 'list-layout-unavailable', 'normalized', 'AsciiDoc list rendering uses paragraph wrappers; this adapter uses loose lists.')
      const items = await Promise.all(n.getItems().map(async (item, i) => {
        if (Object.hasOwn(item.getAttributes(), 'checkbox')) ctx.note(`${path}/items/${i}/checkbox`, 'unsupported-field', 'dropped', 'AsciiDoc task state is outside this adapter subset.')
        return { type: 'list_item', children: [{ type: 'paragraph', children: await inline(await item.getText(), `${path}/items/${i}/text`) }, ...await mapItem(item, `${path}/items/${i}`)] }
      }))
      const start = Number(n.getAttribute('start') ?? 1)
      return { type: 'list', ordered: type === 'olist', tight: false, items, ...(type === 'olist' && start !== 1 ? { start } : {}) }
    }
    return ctx.unsupported({ type, text: plain(parseHtml(await n.convert())) }, path, true)
  }
  const mapItem = async (n, path) => coalesce((await Promise.all(n.getBlocks().map((c, i) => map(c, `${path}/blocks/${i}`)))).flat())
  return map(root, '')
}

export function exportForeign(tool, ast) {
  const ctx = context(tool)
  let source
  if (tool === 'hast') source = hastWriter.stringify(toHast(ast, ctx))
  else if (tool === 'mdast') source = mdWriter.stringify(toMdast(ast, ctx))
  else if (['commonmark', 'cmark', 'md4c'].includes(tool)) {
    // Use the same restricted mapping as mdast so unsupported Carve fields are reported.
    source = mdWriter.stringify(toMdast(ast, ctx))
  } else if (tool === 'djot') {
    const tree = toDjot(ast, ctx)
    const hasBreak = n => n.tag === 'hard_break' || n.children?.some(hasBreak)
    if (hasBreak(tree)) {
      ctx.note('', 'foreign-writer-workaround', 'normalized', 'djot.js 0.3.2 cannot serialize hard_break; used the subset writer.')
      source = exportRichSource(tool, ast, ctx)
    } else source = djot.renderDjot(tree)
  }
  else if (tool === 'docutils' || tool === 'asciidoctor') source = exportRichSource(tool, ast, ctx)
  else throw new Error(`Unknown compatibility tool: ${tool}`)
  return { source, diagnostics: ctx.diagnostics }
}

function exportFields(n, path, ctx, allowed = []) {
  for (const key of Object.keys(n)) {
    if (['type', 'children', 'items', 'pos', 'srcByteLength', 'bulletChar', 'delim', ...allowed].includes(key)) continue
    ctx.note(`${path}/${key}`, 'unsupported-field', 'dropped', `${key} is outside the ${ctx.tool} adapter subset.`)
  }
}

export function toMdast(root, ctx = context('mdast')) {
  const map = (n, path) => {
    exportFields(n, path, ctx, ['value', 'level', 'ordered', 'tight', 'start', 'href', 'src', 'alt', 'title', 'content', 'lang'])
    const children = () => (n.children ?? n.items ?? []).map((c, i) => map(c, `${path}/children/${i}`))
    if (n.type === 'strike' && ['commonmark', 'cmark', 'md4c'].includes(ctx.tool)) return { type: 'text', value: plain(ctx.unsupported(n, path)) }
    if (n.type === 'document') return { type: 'root', children: children() }
    if ((n.type === 'text' || n.type === 'escaped_text')) return { type: 'text', value: n.value }
    if (['paragraph', 'strong', 'emphasis', 'block_quote', 'list_item', 'strike'].includes(n.type)) return { type: ({ block_quote: 'blockquote', list_item: 'listItem', strike: 'delete' })[n.type] ?? n.type, children: children() }
    if (n.type === 'heading') return { type: 'heading', depth: n.level, children: children() }
    if (n.type === 'code') return { type: 'inlineCode', value: n.value }
    if (n.type === 'code_block') return { type: 'code', value: n.content.replace(/\n$/, ''), ...(n.lang ? { lang: n.lang } : {}) }
    if (n.type === 'link' || n.type === 'image') return { type: n.type, url: n.href ?? n.src, ...(n.title ? { title: n.title } : {}), ...(n.type === 'link' ? { children: children() } : { alt: n.alt }) }
    if (n.type === 'list') return { type: 'list', ordered: n.ordered, start: n.start ?? 1, spread: !n.tight, children: children().map(item => ({ ...item, spread: !n.tight })) }
    if (n.type === 'hard_break' || n.type === 'thematic_break') return { type: n.type === 'hard_break' ? 'break' : 'thematicBreak' }
    const fallback = ctx.unsupported(n, path)
    return { type: 'text', value: plain(fallback) }
  }
  return map(root, '')
}

export function toHast(root, ctx = context('hast')) {
  const element = (tagName, children = [], properties = {}) => ({ type: 'element', tagName, children, properties })
  const map = (n, path, tight = false) => {
    exportFields(n, path, ctx, ['value', 'level', 'ordered', 'tight', 'start', 'href', 'src', 'alt', 'title', 'content', 'lang', 'attrs'])
    const children = () => (n.children ?? n.items ?? []).flatMap((c, i) => map(c, `${path}/children/${i}`, n.type === 'list' ? n.tight : tight))
    if (n.type === 'document') return { type: 'root', children: children() }
    if ((n.type === 'text' || n.type === 'escaped_text')) return { type: 'text', value: n.value }
    let out
    if (n.type === 'paragraph' && tight) return children()
    const tags = { paragraph: 'p', emphasis: 'em', strong: 'strong', strike: 'del', block_quote: 'blockquote', list_item: 'li', hard_break: 'br', thematic_break: 'hr' }
    if (tags[n.type]) out = element(tags[n.type], children())
    else if (n.type === 'heading') out = element(`h${n.level}`, children())
    else if (n.type === 'code') out = element('code', [{ type: 'text', value: n.value }])
    else if (n.type === 'code_block') out = element('pre', [element('code', [{ type: 'text', value: n.content }], n.lang ? { className: [`language-${n.lang}`] } : {})])
    else if (n.type === 'link') out = element('a', children(), { href: n.href, ...(n.title ? { title: n.title } : {}) })
    else if (n.type === 'image') out = element('img', [], { src: n.src, alt: n.alt, ...(n.title ? { title: n.title } : {}) })
    else if (n.type === 'list') out = element(n.ordered ? 'ol' : 'ul', children(), n.ordered && n.start ? { start: n.start } : {})
    else return { type: 'text', value: plain(ctx.unsupported(n, path)) }
    if (n.attrs) Object.assign(out.properties, { ...(n.attrs.id ? { id: n.attrs.id } : {}), ...(n.attrs.classes ? { className: n.attrs.classes } : {}), ...n.attrs.keyValues })
    return out
  }
  return map(root, '')
}

export function toDjot(root, ctx = context('djot')) {
  const map = (n, path) => {
    exportFields(n, path, ctx, ['value', 'level', 'ordered', 'tight', 'start', 'href', 'src', 'alt', 'content', 'lang', 'attrs'])
    const children = () => (n.children ?? n.items ?? []).map((c, i) => map(c, `${path}/children/${i}`))
    let out
    if (n.type === 'document') out = { tag: 'doc', references: {}, autoReferences: {}, footnotes: {}, children: children() }
    else if ((n.type === 'text' || n.type === 'escaped_text')) out = { tag: 'str', text: n.value }
    else if (['paragraph', 'emphasis', 'strong', 'block_quote', 'list_item'].includes(n.type)) out = { tag: ({ paragraph: 'para', emphasis: 'emph' })[n.type] ?? n.type, children: children() }
    else if (n.type === 'heading') out = { tag: 'heading', level: n.level, children: children() }
    else if (n.type === 'code') out = { tag: 'verbatim', text: n.value }
    else if (n.type === 'code_block') out = { tag: 'code_block', text: n.content, ...(n.lang ? { lang: n.lang } : {}) }
    else if (n.type === 'link' || n.type === 'image') out = { tag: n.type, destination: n.href ?? n.src, children: n.type === 'image' ? [{ tag: 'str', text: n.alt }] : children() }
    else if (n.type === 'list') out = { tag: n.ordered ? 'ordered_list' : 'bullet_list', tight: n.tight, style: n.ordered ? '1.' : '-', ...(n.ordered ? { start: n.start ?? 1 } : {}), children: children() }
    else if (n.type === 'hard_break' || n.type === 'thematic_break') out = { tag: n.type }
    else out = { tag: 'str', text: plain(ctx.unsupported(n, path)) }
    if (n.attrs) out.attributes = { ...(n.attrs.id ? { id: n.attrs.id } : {}), ...(n.attrs.classes ? { class: n.attrs.classes.join(' ') } : {}), ...n.attrs.keyValues }
    return out
  }
  return map(root, '')
}

function exportRichSource(tool, root, ctx) {
  const rst = tool === 'docutils', isDjot = tool === 'djot'
  const headingStyles = new Map()
  const htmlText = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\]/g, '&#93;').replace(/\[/g, '&#91;').replace(/\\/g, '&#92;')
  const escape = s => rst ? s.replace(/[\p{P}\p{S}\\]/gu, '\\$&') : isDjot ? s.replace(/[\\*_`\[\]]/g, '\\$&') : `pass:[${htmlText(s)}]`
  const fence = (value, char, min) => char.repeat(Math.max(min - 1, ...value.split('\n').filter(l => new RegExp(`^${char}+$`).test(l)).map(l => l.length)) + 1)
  const joinBlocks = (nodes, values) => values.map((value, i) => (i ? (nodes[i - 1].type === 'list' && nodes[i].type === 'list' ? (rst ? '\n\n..\n\n' : isDjot ? '\n\n' : '\n\n//\n\n') : '\n\n') : '') + value).join('')
  const map = (n, path, listKinds = []) => {
    exportFields(n, path, ctx, ['value', 'level', 'ordered', 'tight', 'start', 'href', 'content', 'lang'])
    const children = () => (n.children ?? n.items ?? []).map((c, i) => map(c, `${path}/children/${i}`, listKinds))
    if (n.type === 'document') return joinBlocks(n.children, children()) + '\n'
    if ((n.type === 'text' || n.type === 'escaped_text')) return escape(n.value)
    if (n.type === 'soft_break') return escape(' ')
    if (n.type === 'paragraph' || n.type === 'list_item') return n.type === 'paragraph' ? children().join('') : joinBlocks(n.children, children())
    if (n.type === 'strong' || n.type === 'emphasis') {
      const marker = rst ? n.type === 'strong' ? '**' : '*' : isDjot ? n.type === 'strong' ? '*' : '_' : n.type === 'strong' ? '**' : '__'
      const value = marker + children().join('') + marker
      return rst ? '\\ ' + value + '\\ ' : value
    }
    if (n.type === 'code') {
      if (rst && (!n.value || /``|^\s|\s$|\n/.test(n.value))) {
        ctx.note(`${path}/value`, 'unsupported-field', 'degraded', 'This reStructuredText inline literal cannot preserve its delimiter or boundary whitespace; retained plain text.')
        return escape(n.value)
      }
      if (isDjot) return djot.renderDjot({ tag: 'doc', references: {}, autoReferences: {}, footnotes: {}, children: [{ tag: 'para', children: [{ tag: 'verbatim', text: n.value }] }] }).replace(/\n+$/, '')
      return rst ? '\\ ``' + n.value + '``\\ ' : '``' + escape(n.value) + '``'
    }
    if (isDjot && n.type === 'hard_break') return '\\\n'
    if (n.type === 'heading') {
      const value = children().join('')
      if (!rst) return (isDjot ? '#' : '=').repeat(n.level) + ' ' + value
      if (!headingStyles.has(n.level)) {
        if (n.level !== headingStyles.size + 2) ctx.note(`${path}/level`, 'unsupported-field', 'degraded', 'reStructuredText assigns levels by first-seen adornment; this heading level cannot be preserved.')
        headingStyles.set(n.level, ['=', '-', '~', '^', '"', '+'][headingStyles.size])
      }
      return value + '\n' + headingStyles.get(n.level).repeat(Math.max(3, value.length))
    }
    if (n.type === 'link') return isDjot ? '[' + children().join('') + '](' + n.href + ')' : rst ? '\\ `' + children().join('') + ' <' + n.href + '>`__\\ ' : 'link:' + n.href + '[' + children().join('') + ']'
    if (n.type === 'list') {
      if (n.tight && !isDjot) ctx.note(`${path}/tight`, 'list-layout-unavailable', 'degraded', 'Exported a loose list for this document model.')
      if (rst || isDjot) return n.items.map((item, i) => {
        const marker = n.ordered ? `${(n.start ?? 1) + i}. ` : '- '
        const body = map(item, `${path}/children/${i}`, [...listKinds, n.ordered])
        return marker + body.replace(/\n/g, '\n' + ' '.repeat(marker.length))
      }).join(n.tight && isDjot ? '\n' : '\n\n')
      const marker = (n.ordered ? '.' : '*').repeat(listKinds.filter(kind => kind === n.ordered).length + 1) + ' '
      const items = n.items.map((item, i) => {
        exportFields(item, `${path}/children/${i}`, ctx)
        const parts = item.children.map((block, j) => map(block, `${path}/children/${i}/children/${j}`, [...listKinds, n.ordered]))
        return marker + parts.join('\n+\n')
      })
      return (n.ordered && (n.start ?? 1) !== 1 ? `[start=${n.start}]\n` : '') + items.join('\n\n')
    }
    if (n.type === 'block_quote') {
      const value = joinBlocks(n.children, children())
      if (isDjot) return value.split('\n').map(l => '> ' + l).join('\n')
      if (rst) return '..\n\n' + value.split('\n').map(l => '    ' + l).join('\n')
      const delimiter = fence(value, '_', 4)
      return '[quote]\n' + delimiter + '\n' + value + '\n' + delimiter
    }
    if (n.type === 'code_block') {
      if (rst) return `.. code::${n.lang ? ' ' + n.lang : ''}\n\n` + n.content.replace(/\n$/, '').split('\n').map(l => '    ' + l).join('\n')
      const delimiter = fence(n.content, isDjot ? '`' : '-', isDjot ? 3 : 4)
      return (isDjot ? delimiter + (n.lang ?? '') : (n.lang ? '[source,' + n.lang + ']\n' : '') + delimiter) + '\n' + n.content + delimiter
    }
    if (n.type === 'thematic_break') return isDjot ? '---' : rst ? '----------' : "'''"
    return escape(plain(ctx.unsupported(n, path)))
  }
  return map(root, '')
}

export const carveAst = source => toAstJson(parse(source))
