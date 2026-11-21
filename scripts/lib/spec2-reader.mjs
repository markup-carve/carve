// The reader checks of the tree contract that the gate script can state beyond the schema (C2-A-188).
// readerProblems(tree) lists every refusal it finds, each with the clause that states it. The tree gate
// runs it on every positive and imported tree, which must give none, and on every tree that
// trees/refused.json marks as refused by the reader, which must give one that cites a clause of the entry.
// Checks that need a registry, a sidecar or the source of a reader are not here: unknown required
// extensions beyond the standard ones, annotation ids against ranges, srcByteLength against source.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const load = (spec, name) => JSON.parse(readFileSync(join(spec, 'data', name), 'utf8'))

export function readerChecks (spec) {
  const schema = load(spec, 'ast-schema.json')
  const NODE_TYPES = new Set(Object.keys(schema.$defs))
  const smart = load(spec, 'smart-punctuation.json')
  const smartKinds = new Map()
  for (const rows of Object.values(smart)) if (Array.isArray(rows)) for (const row of rows) if (row.kind) smartKinds.set(row.kind, row)
  const standard = new Map(load(spec, 'extensions.json').extensions.map(ext => [ext.name, ext]))
  const slots = load(spec, 'node-slots.json').nodes
  const limits = Object.fromEntries(load(spec, 'limits.json').limits.map(limit => [limit.name, limit.value]))
  const isNode = (value) => value !== null && typeof value === 'object' && !Array.isArray(value) && NODE_TYPES.has(value.type)
  const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
  const qualified = (name) => typeof name === 'string' && name.includes('.')
  // C2-B-190: the nodes that count one level of block nesting.
  const BLOCK_LEVEL = new Set(['block_quote', 'list', 'list_item', 'definition_list', 'definition_description', 'footnote', 'div', 'admonition', 'directive', 'figure_group'])
  const DEFINITIONS = new Set(['footnote', 'link_reference_definition', 'abbreviation_def', 'citation_definition'])
  const INLINE_CONTAINERS = new Set(Object.entries(schema.$defs).filter(([, def]) => def.properties?.children).map(([type]) => type))
  const ADMONITIONS = ['note', 'tip', 'warning', 'danger', 'info', 'success', 'example', 'quote']
  const DIRECTIVES = ['bibliography', 'footnotes', 'glossary', 'index', 'references', 'toc']

  /** Every node-shaped object in an opaque value (C2-A-189). */
  function nodeShaped (value) {
    if (Array.isArray(value)) return value.some(nodeShaped)
    if (!isObject(value)) return false
    if (typeof value.type === 'string' && NODE_TYPES.has(value.type)) return true
    return Object.values(value).some(nodeShaped)
  }

  return function readerProblems (tree, { envelope, annotations } = {}) {
    const problems = []
    const add = (path, clause, what) => problems.push({ path: path || '/', clause, what })
    const declarations = [...(tree.extensions ?? []), ...(envelope?.extensions ?? [])]
    const declared = new Map()
    for (const list of [tree.extensions ?? [], envelope?.extensions ?? []]) {
      const names = new Set()
      for (const decl of list) {
        if (names.has(decl.name)) add('/extensions', 'C2-A-017', `${decl.name} is declared twice in one list`)
        names.add(decl.name)
      }
    }
    for (const decl of declarations) {
      const other = declared.get(decl.name)
      if (other && (other.version !== decl.version || other.required !== decl.required || JSON.stringify(other.slots) !== JSON.stringify(decl.slots))) {
        add('/extensions', 'C2-A-017', `the root and the envelope declare ${decl.name} differently`)
      }
      declared.set(decl.name, decl)
      if (decl.required && !(standard.get(decl.name)?.version === decl.version)) add('/extensions', 'C2-A-018', `${decl.name} is required and not implemented`)
    }
    if (envelope && envelope.astVersion !== tree.astVersion) add('/', 'C2-A-013', 'the envelope and the document carry different astVersion strings')

    const resources = new Map()
    for (const [at, entry] of (tree.resources ?? []).entries()) {
      if (resources.has(entry.id)) add(`/resources/${at}`, 'C2-A-131', `the resource id ${entry.id} occurs twice`)
      resources.set(entry.id, entry)
    }
    let resourceReferences = 0
    const annotationIds = new Set()
    const annotationOwners = new Map()
    const headerIds = new Map()
    const cellsWithHeaderIds = []
    let metadataFields = 0

    function metadataDepth (value, depth, path) {
      if (!isObject(value) || typeof value.kind !== 'string') return
      if (depth > limits.metadata_depth) return add(path, 'C2-A-212', 'more than 64 nested metadata values')
      if (value.kind === 'list') value.value.forEach((item, at) => metadataDepth(item, depth + 1, `${path}/value/${at}`))
      if (value.kind === 'map') {
        metadataFields += Object.keys(value.value).length
        for (const [key, item] of Object.entries(value.value)) metadataDepth(item, depth + 1, `${path}/value/${key}`)
      }
    }

    // ctx: block depth and inline depth within the current file, the enclosing qualified fallback, the
    // number of nested unqualified inline extension nodes, the qualified extension depth.
    function visit (node, path, ctx, parent, key) {
      const { type } = node
      // C2-A-029, C2-A-189: data keys are declared and hold no node.
      if (isObject(node.data)) {
        for (const [name, value] of Object.entries(node.data)) {
          if (!declared.has(name)) add(`${path}/data`, 'C2-A-029', `the data key ${name} has no declaration`)
          if (nodeShaped(value)) add(`${path}/data/${name}`, 'C2-A-189', 'a node-shaped object inside data')
          if (name === 'carve.annotation' && Array.isArray(value?.ids)) {
            const seen = new Set()
            for (const id of value.ids) {
              if (seen.has(id) || annotationIds.has(id)) add(`${path}/data/${name}`, 'C2-A-203', `the annotation id ${id} occurs twice`)
              seen.add(id)
            }
            for (const id of seen) { annotationIds.add(id); annotationOwners.set(id, path) }
          }
        }
      }
      // C2-A-035: semantic lowercase keys stay distinct from ordinary case variants.
      const pairs = node.attrs?.keyValues
      if (Array.isArray(pairs)) {
        const names = new Set()
        for (const [name] of pairs) {
          const asciiLower = name.replace(/[A-Z]/g, c => c.toLowerCase())
          const folded = ['abbr', 'time', 'kbd'].includes(asciiLower) && name === asciiLower ? `semantic:${asciiLower}` : `ordinary:${asciiLower}`
          if (names.has(folded)) add(`${path}/attrs/keyValues`, 'C2-A-035', `the key ${name} occurs twice`)
          names.add(folded)
        }
      }
      if (typeof node.attrs?.id === 'string' && type === 'table_cell' && node.header) headerIds.set(node.attrs.id, true)
      else if (typeof node.attrs?.id === 'string' && !headerIds.has(node.attrs.id)) headerIds.set(node.attrs.id, false)
      if (isObject(node.metadata)) {
        for (const [name, value] of Object.entries(node.metadata.fields ?? {})) { metadataFields++; metadataDepth(value, 1, `${path}/metadata/fields/${name}`) }
      }
      // C2-A-049: frontmatter is the first child of the document or of an include.
      if (type === 'frontmatter' && !(key === 'children' && (parent?.type === 'document' || parent?.type === 'include') && parent.children[0] === node)) {
        add(path, 'C2-A-049', 'frontmatter that is not the first child of the document or of an include')
      }
      // C2-A-052: a definition stands only in the children of the document or of an expanded include.
      if (DEFINITIONS.has(type) && !(key === 'children' && (parent?.type === 'document' || parent?.type === 'include'))) {
        add(path, 'C2-A-052', `a ${type} inside a container`)
      }
      if (type === 'table') {
        // C2-A-086: at most one head, then bodies, then at most one foot.
        const groups = node.children.filter(child => child.type !== 'comment').map(child => child.type)
        const rank = { table_head: 0, table_body: 1, table_foot: 2 }
        if (groups.some((group, at) => at > 0 && rank[group] < rank[groups[at - 1]])
          || groups.filter(g => g === 'table_head').length > 1 || groups.filter(g => g === 'table_foot').length > 1) {
          add(path, 'C2-A-086', `table groups in the order ${groups.join(', ')}`)
        }
        // C2-A-093: a rowspan does not reach past the last row of its group.
        node.children.forEach((group, g) => {
          if (group.type === 'comment') return
          const rows = group.children.filter(row => row.type === 'table_row')
          rows.forEach((row, r) => row.children.forEach((cell, c) => {
            if ((cell.rowspan ?? 1) > rows.length - r) add(`${path}/children/${g}/children/${group.children.indexOf(row)}/children/${c}`, 'C2-A-093', 'a rowspan that reaches past its group')
          }))
        })
      }
      if (type === 'table_row') {
        // C2-A-093: a colspan count against the colspan marks that follow its cell.
        node.children.forEach((cell, at) => {
          if (cell.span) return
          let marks = 0
          while (node.children[at + 1 + marks]?.span === 'colspan') marks++
          if (marks && (cell.colspan ?? 1) !== marks + 1) add(`${path}/children/${at}`, 'C2-A-093', `colspan ${cell.colspan ?? 1} against ${marks} colspan marks`)
        })
      }
      if (type === 'table_cell') {
        // C2-A-091: the children of a table cell.
        const paragraphs = node.children.filter(child => child.type === 'cell_paragraph').length
        if (!node.span && node.children.length === 0) add(path, 'C2-A-091', 'a table cell with no children')
        if (paragraphs && node.children.length > 1) add(path, 'C2-A-091', 'a cell_paragraph beside another child of its cell')
        if (Array.isArray(node.headerIds)) cellsWithHeaderIds.push([path, node.headerIds])
      }
      if (type === 'autolink' && 'text' in node && node.text === node.href) add(path, 'C2-A-058', 'an autolink text equal to its href')
      if (type === 'smart_punctuation') {
        const row = smartKinds.get(node.kind)
        if (!row) add(path, 'C2-A-098', `the smart punctuation kind ${node.kind} is not in the table`)
        else {
          if (node.glyph !== row.glyph) add(path, 'C2-A-098', `the glyph of ${node.kind} is ${row.glyph}`)
          if (node.source !== row.source) add(path, 'C2-A-098', `the source of ${node.kind} is ${row.source}`)
        }
      }
      if (type === 'include' && isObject(node.options)) {
        for (const name of ['lines', 'rows', 'cols']) {
          const value = node.options[name]
          const range = typeof value === 'string' && /^(\d+)-(\d+)$/.exec(value)
          if (range && Number(range[1]) > Number(range[2])) add(`${path}/options/${name}`, 'C2-A-181', `the range ${value} runs backwards`)
        }
      }
      if (type === 'image' && typeof node.resourceId === 'string') {
        resourceReferences++
        if (!resources.has(node.resourceId)) add(path, 'C2-A-131', `the resource ${node.resourceId} is not in the manifest`)
      }
      if (type === 'block_extension' || type === 'inline_extension') {
        if (ctx.qualifiedFallback) add(path, 'C2-A-126', 'an extension node inside a qualified fallback')
        if (qualified(node.name)) {
          const decl = declared.get(node.name)
          if (!decl) add(path, 'C2-A-123', `${node.name} has no declaration`)
          else {
            if (decl.version !== node.version) add(path, 'C2-X-018', `${node.name} carries version ${node.version} against ${decl.version}`)
            for (const slot of Object.keys(node.slots ?? {})) if (!decl.slots.includes(slot)) add(`${path}/slots/${slot}`, 'C2-X-020', `the slot ${slot} is not declared`)
          }
          for (const id of node.resourceIds ?? []) {
            resourceReferences++
            if (!resources.has(id)) add(path, 'C2-A-131', `the resource ${id} is not in the manifest`)
          }
          if (nodeShaped(node.props)) add(`${path}/props`, 'C2-A-189', 'a node-shaped object inside props')
          const source = node.source
          if (isObject(source)) {
            const name = source.name
            if (source.form === 'fence' && (typeof name !== 'string' || name === '' || name.startsWith('=') || /[\s`{]/.test(name))) add(`${path}/source`, 'C2-X-025', `the fence name ${name} opens no code block`)
            if (source.form === 'div' && (ADMONITIONS.includes(name) || DIRECTIVES.includes(name) || (name === 'figure' && !source.title && !source.label))) add(`${path}/source`, 'C2-X-025', `the div name ${name} makes no plain div`)
            if (source.form === 'inline' && !/^[A-Za-z_][A-Za-z0-9_-]*$/.test(name ?? '')) add(`${path}/source`, 'C2-X-025', `${name} is no inline extension name`)
          }
          if (ctx.extensionDepth + 1 > limits.extension_depth) add(path, 'C2-X-031', 'more than 32 nested qualified extension nodes')
        } else {
          // C2-A-124: an unqualified inline extension carries name, children and the common fields only.
          const allowed = new Set(['type', 'name', 'children', 'attrs', 'data', 'pos', 'segments', 'metadata', 'dir', 'lang'])
          for (const field of Object.keys(node)) if (!allowed.has(field)) add(path, 'C2-A-124', `the field ${field} on an unqualified inline extension`)
          if (ctx.fallbackDepth + 1 > limits.extension_fallback_depth) add(path, 'C2-X-030', 'more than 32 nested unqualified inline extension nodes')
        }
      }
      // C2-X-046: the standard tabs extension.
      if (type === 'block_extension' && node.name === 'carve.tab') {
        if (!(key === 'tabs' && parent?.type === 'block_extension' && parent.name === 'carve.tabs')) add(path, 'C2-X-046', 'a carve.tab outside carve.tabs.slots.tabs')
        if (!Array.isArray(node.slots?.body)) add(path, 'C2-X-046', 'a tab without its body slot')
      }
      if (type === 'block_extension' && node.name === 'carve.tabs') {
        for (const [at, item] of (node.slots?.tabs ?? []).entries()) if (item.type !== 'block_extension' || item.name !== 'carve.tab') add(`${path}/slots/tabs/${at}`, 'C2-X-046', 'an item of the tabs slot that is not carve.tab')
      }
      // C2-A-171: nesting within one file.
      const nextBlock = ctx.blockDepth + (BLOCK_LEVEL.has(type) ? 1 : 0)
      if (BLOCK_LEVEL.has(type) && nextBlock > limits.block_depth) add(path, 'C2-A-171', 'more than 200 nested blocks')
      const inlineNode = INLINE_CONTAINERS.has(type) && ctx.inInline
      const nextInline = inlineNode ? ctx.inlineDepth + 1 : 0
      if (inlineNode && nextInline > limits.inline_depth) add(path, 'C2-A-171', 'more than 200 nested inline levels')

      for (const [field, value] of Object.entries(node)) {
        if (field === 'data' || field === 'pos' || field === 'segments' || field === 'attrs' || field === 'props' || field === 'payload' || field === 'source') continue
        const inner = {
          blockDepth: type === 'include' && field === 'children' ? 0 : nextBlock,
          inInline: ctx.inInline || ['paragraph', 'heading', 'cell_paragraph', 'definition_term', 'line', 'citation_definition'].includes(type),
          inlineDepth: ctx.inInline ? nextInline : 0,
          qualifiedFallback: ctx.qualifiedFallback || ((type === 'block_extension' || type === 'inline_extension') && qualified(node.name) && field === 'fallback'),
          fallbackDepth: type === 'inline_extension' && !qualified(node.name) ? ctx.fallbackDepth + 1 : ctx.fallbackDepth,
          extensionDepth: (type === 'block_extension' || type === 'inline_extension') && qualified(node.name) ? ctx.extensionDepth + 1 : ctx.extensionDepth,
        }
        descend(value, `${path}/${field}`, inner, node, field)
      }
    }
    function descend (value, path, ctx, parent, key) {
      if (Array.isArray(value)) return value.forEach((item, at) => descend(item, `${path}/${at}`, ctx, parent, key))
      if (!isObject(value)) return
      if (isNode(value)) return visit(value, path, ctx, parent, key)
      for (const [field, item] of Object.entries(value)) descend(item, `${path}/${field}`, ctx, parent, field)
    }
    visit(tree, '', { blockDepth: 0, inInline: false, inlineDepth: 0, qualifiedFallback: false, fallbackDepth: 0, extensionDepth: 0 }, null, null)

    // C2-A-092: headerIds name header cells.
    for (const [path, ids] of cellsWithHeaderIds) for (const id of ids) if (headerIds.get(id) !== true) add(`${path}/headerIds`, 'C2-A-092', `${id} names no header cell`)
    if (resourceReferences > limits.extension_resource_references) add('/', 'C2-A-132', 'more than 4096 resource references')
    if (metadataFields > limits.metadata_fields) add('/metadata', 'C2-A-212', 'more than 256 named metadata entries')
    if (annotations) {
      const ranges = new Map()
      const nodeAt = pointer => {
        if (typeof pointer !== 'string' || !/^(?:|\/(?:[^~/]|~[01])*)*$/.test(pointer)) return null
        let value = tree
        for (const token of pointer.split('/').slice(1)) value = value?.[token.replaceAll('~1', '/').replaceAll('~0', '~')]
        return isNode(value) ? value : null
      }
      const annotationText = node => {
        let own = node.type === 'soft_break' || node.type === 'hard_break' ? '\n' : node.type === 'non_breaking_space' ? '\u00a0' :
          node.type === 'smart_punctuation' ? node.source : node.value ?? node.alt ?? ''
        const childText = value => Array.isArray(value) ? value.map(childText).join('') : isNode(value) ? annotationText(value) : isObject(value) ? Object.values(value).map(childText).join('') : ''
        for (const slot of slots[node.type] ?? []) {
          let value = node
          for (const key of slot.split('.')) {
            if (key === '*') {
              value = (declared.get(node.name)?.slots ?? []).map(name => value?.[name])
              continue
            }
            value = value?.[key]
          }
          own += childText(value)
        }
        return own
      }
      for (const [index, range] of (annotations.ranges ?? []).entries()) {
        if (ranges.has(range.id)) add(`/ranges/${index}/id`, 'C2-A-203', `range id ${range.id} occurs twice`)
        ranges.set(range.id, range)
        for (const side of ['start', 'end']) {
          const endpoint = range[side]
          const path = `/ranges/${index}/${side}`
          const node = nodeAt(endpoint?.path)
          if (!node) { add(`${path}/path`, 'C2-A-214', 'endpoint names no node'); continue }
          const text = annotationText(node)
          const boundaries = new Set([0]); let bytes = 0
          for (const char of text) { bytes += Buffer.byteLength(char); boundaries.add(bytes) }
          if (!boundaries.has(endpoint.offset)) add(`${path}/offset`, 'C2-A-207', 'offset is not a character boundary of annotation text')
        }
      }
      for (const [id, path] of annotationOwners) {
        const range = ranges.get(id)
        if (!range) add(`${path}/data/carve.annotation`, 'C2-A-203', `annotation ${id} has no range`)
        else if (![range.start.path, range.end.path].some(endpoint => endpoint === path || endpoint.startsWith(`${path}/`)))
          add(`${path}/data/carve.annotation`, 'C2-A-203', `annotation ${id} has no endpoint on its node or a descendant`)
      }
    }

    return problems
  }
}

/**
 * The pointer of the node a tree refused by the reader is refused at (C2-A-167): the place of the first reader
 * problem that cites a clause of the entry. An envelope's document is under `/document`.
 */
export function refusedNodePath (entry, readerProblems) {
  const isEnvelope = entry.tree.type === undefined && entry.tree.document !== undefined
  const found = isEnvelope ? readerProblems(entry.tree.document, { envelope: entry.tree, annotations: entry.annotations }) : readerProblems(entry.tree, { annotations: entry.annotations })
  const problem = found.find(item => entry.clauses.includes(item.clause))
  if (!problem) return undefined
  const path = problem.path === '/' ? '' : problem.path
  return isEnvelope && !['/', '/extensions'].includes(problem.path) ? `/document${path}` : path
}
