/*
 * The decision trace (docs/decision-trace.md): one JSON record per decision,
 * versioned by a header line. The spec model emits block records from its
 * ownership walk; `firstDivergence` finds where two traces part.
 */
import { parse } from './layout.mjs'

export const TRACE_FORMAT = 'carve-decision-trace'
export const TRACE_VERSION = 1

export const header = (engine) => ({ trace: TRACE_FORMAT, version: TRACE_VERSION, engine })

export function modelTrace(source) {
  const records = []
  parse(source, { trace: records })
  return records
}

export const toJsonLines = (engine, records) =>
  [header(engine), ...records].map((r) => JSON.stringify(r)).join('\n') + '\n'

/** Parse a JSON-lines trace; throws on a missing or foreign header. */
export function readJsonLines(text) {
  const rows = text.split('\n').filter((l) => l.trim() !== '').map((l) => JSON.parse(l))
  const head = rows.shift()
  if (head?.trace !== TRACE_FORMAT) throw new Error(`not a ${TRACE_FORMAT} stream: first line is ${JSON.stringify(head)}`)
  if (head.version !== TRACE_VERSION) throw new Error(`trace version ${head.version}, this reader knows ${TRACE_VERSION}`)
  return { header: head, records: rows }
}

const DECISION_KEYS = ['line', 'pos', 'step', 'owner', 'form', 'kind', 'decision', 'pair', 'cell', 'closed', 'reached', 'plus', 'rule']

const decision = (record) => JSON.stringify(DECISION_KEYS.map((k) => record?.[k] ?? null))

/** Index of the first record where `a` and `b` differ, or -1. A shorter trace differs where it stops. */
export function firstDivergence(a, b) {
  const n = Math.max(a.length, b.length)
  for (let i = 0; i < n; i++) if (decision(a[i]) !== decision(b[i])) return i
  return -1
}
