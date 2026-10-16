// Block-structure family: a probe line at, below and past every content column
// of a container stack, with and without quote markers, before a follower.
// Deterministic: singles are enumerated in full, nestings are sampled by seed.

const HOST = 'para'

// Each layer: the marker-line text it writes, the width it adds, whether it is a
// quote (reached only by its marker), and the lines that must precede it.
const LAYERS = {
  note: { open: '', head: '::: note', width: 0 },
  quote: { open: '> ', width: 2, quote: true },
  item: { open: '- ', width: 2 },
  ordered: { open: '1. ', width: 3 },
  desc: { open: ': ', width: 2, head: ':: t' },
  footnote: { open: '[^c]: ', width: 2, footnote: true },
}
const KINDS = Object.keys(LAYERS)

export const PROBES = {
  linkdef: '[r]: /u',
  notedef: '[^p]: n',
  attr: '{#x}',
  comment: '%% c',
  heading: '# H',
  row: '| a |',
  rule: '---',
  item: '- li',
}

// The matched `%%%` spelling of the comment probe, written at the same column.
const FENCED = { commentFence: ['%%%', 'c', '%%%'] }

export const FOLLOWERS = {
  col0: 'tail',
  blank: '\ntail',
  fence: '```\nx',
  closer: '::::\ntail',
  content: null,
}

function mulberry32(seed) {
  return () => {
    seed |= 0
    seed = seed + 0x6d2b79f5 | 0
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

// Lay out a stack: the opening lines, every layer's content column, and each
// quote's marker column.
function layout(stack) {
  const lines = []
  let marker = ''
  let deepest = 0
  let notes = 0
  const quotes = []
  const columns = [0]
  for (const kind of stack) {
    const layer = LAYERS[kind]
    if (layer.head) {
      // A head line (a note opener, a term) sits where the layer starts; the
      // layer's own marker then starts the next line at that column.
      const start = marker.length
      lines.push(marker + layer.head)
      marker = lineAt(quotes, start, true, '')
    }
    const start = marker.length
    if (layer.quote) quotes.push(start)
    // A second footnote layer takes its own label, so it is not a duplicate.
    marker += layer.footnote && notes++ ? layer.open.replace('c', 'd') : layer.open
    // A footnote body sits two columns past its marker, not past its label.
    deepest = layer.footnote ? start + layer.width : marker.length
    columns.push(deepest)
  }
  lines.push(marker + HOST)
  return { lines, columns: [...new Set(columns)], quotes, deepest }
}

// The text before `column`, with `>` written at each quote column when marked.
function quotePrefix(quotes, column, marked) {
  let out = ''
  for (const q of quotes) {
    if (q >= column) break
    out += ' '.repeat(q - out.length) + (marked ? '>' : ' ')
    if (out.length < column) out += ' '
  }
  return out
}

function lineAt(quotes, column, marked, text) {
  const prefix = quotePrefix(quotes, column, marked)
  return prefix + ' '.repeat(Math.max(0, column - prefix.length)) + text
}

function probeColumns(columns) {
  const out = new Set()
  for (const c of columns) {
    if (c > 0) out.add(c - 1)
    out.add(c)
    out.add(c + 1)
  }
  out.add(Math.max(...columns) + 4)
  return [...out].sort((a, b) => a - b)
}

// Where a column sits against the stack's content columns, e.g. `2+1`.
function relation(column, columns) {
  if (columns.includes(column)) return `${column}`
  const below = columns.filter(c => c < column)
  const base = Math.max(...below)
  return `${base}+${column - base}`
}

function build(stack, hostLine, probe, column, marked, follower) {
  const { lines, quotes, deepest } = layout(stack)
  const body = [...lines]
  if (hostLine) body.push(lineAt(quotes, deepest, marked, 'more'))
  for (const text of FENCED[probe] ?? [PROBES[probe]]) body.push(lineAt(quotes, column, marked, text))
  const tail = FOLLOWERS[follower] ?? lineAt(quotes, deepest, marked, 'tail')
  body.push(tail)
  // The use line comes first so an unclosed fence below cannot swallow it.
  const source = `[r][] [^p] [^c] [^d]\n\n${body.join('\n')}\n`
  return source
}

export function blockFamilyCases({ seed = 3279, nested = 3200 } = {}) {
  const cases = []
  const seen = new Set()
  const add = (tag, source, meta = {}) => {
    if (seen.has(source)) return
    seen.add(source)
    cases.push({ name: `${tag}-${cases.length}`, source, meta })
  }
  const expand = (stack, emit, probes = Object.keys(PROBES)) => {
    const { columns, quotes } = layout(stack)
    for (const hostLine of [false, true])
      for (const probe of probes)
        for (const column of probeColumns(columns))
          for (const marked of quotes.length ? [true, false] : [true])
            for (const follower of Object.keys(FOLLOWERS))
              emit(hostLine, probe, column, marked, follower, { stack: stack.join('/'), hostLine, probe, at: relation(column, columns), marked, follower })
  }
  for (const stack of [[], ...KINDS.map(k => [k])])
    expand(stack, (h, p, c, m, f, meta) => add(`s:${stack.join('/') || 'none'}`, build(stack, h, p, c, m, f), meta),
      [...Object.keys(PROBES), ...Object.keys(FENCED)])

  const pool = []
  for (const outer of KINDS) for (const inner of KINDS)
    expand([outer, inner], (...a) => pool.push([[outer, inner], a]))
  const random = mulberry32(seed)
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  for (const [stack, [h, p, c, m, f, meta]] of pool.slice(0, nested)) {
    add(`n:${stack.join('/')}`, build(stack, h, p, c, m, f), meta)
    // Every sampled line comment also runs as a matched comment fence.
    if (p === 'comment') add(`n:${stack.join('/')}`, build(stack, h, 'commentFence', c, m, f), { ...meta, probe: 'commentFence' })
  }

  for (const source of SEEDS) add('seed', source)
  return cases
}

// Reported by hand before the generator existed; kept as fixed rows.
const SEEDS = [
  // Found outside the product by the carve-js round-4 lane.
  ':: t\n: ![a](x.png)\n^ cap\n',
  '- ![a](x.png)\n^ cap\n',
  ':: t\n: ![a](x.png)\n ^ cap\n',
  '- ![a](x.png)\n ^ cap\n',
  ':: t\n: ![a](x.png)\n  ^ cap\n',
  '- ![a](x.png)\n  ^ cap\n',
  ':: t\n: > para\n^ cap\n',
  ':: t\n: > para\n  ^ cap\n',
  '[^c]: 1. para\n   [^p]: n\nx\n\n[^c] [^p]\n',
  '- > para\n  ^ cap\n',
  '- x\n\n  > para\n  ^ cap\n',
  '- :: term\n  : body\n  +\n  before\n   > nested\n',
  '- a\n\n  before\n   > nested\n',
  '- a\n  %% c\n  before\n   > nested\n',
  '- :: term\n  : body\n  {.x}\n  before\n   > nested\n',
  '- :: term\n  : body\n  # H\n  before\n   > nested\n',
  ':: t\n: ::: note\n  para\n^ cap\n',
  '[^c]: - para\n   [^p]: n\n\n[^c] [^p]\n',
  // A wider description separator moves the body column (carve#3295).
  ':: t\n:  para\n  # H\ntail\n',
  ':: t\n:  para\n  ---\ntail\n',
  ':: t\n:  para\n  | a |\ntail\n',
  ':: t\n:  para\n > q\ntail\n',
  ':: t\n: para\n > q\ntail\n',
  '- > [^f]: n\n  >   more\ntail[^f]\n',
  '- > - para\n  >   [^f]: n\n   >     more\ntail[^f]\n',
  '- > > - para\n    >   [^f]: n\ntail[^f]\n',
  ':: t\n: > [^f]: n\n  >   more\ntail[^f]\n',
  ':: t\n: > - para\n  >   [^f]: n\ntail[^f]\n',
  '- > para\n  > [^f]: n\n  >   - sub\ntail[^f]\n',
  'd\n- para\n  [r]: /u\nx\n\n[r][]\n',
  ':: t\n:  - a\n    [r]: /url\nx\n\n[r][]\n',
  '- - x\n   [r]: /url\ntail\n\n[r][]\n',
]
