/** Reconcile known missing lint rules in both directions. */
export function lintDriftProblems(missing, declared) {
  return [
    ...[...missing].filter(key => !declared.has(key)).map(key => `NEW missing lint rule: ${key}`),
    ...[...declared.keys()].filter(key => !missing.has(key)).map(key => `STALE lint declaration: ${key}`),
  ]
}

export function cleanRefusal(result) {
  return Number.isInteger(result.status) && result.status > 0
    && result.stdout === '' && /cannot spell table_row/.test(result.stderr)
    && !/Fatal error|Stack trace|panicked at/.test(result.stderr)
}

/** Refuse a failed CLI run before counting its missing rules. */
export function lintRules(result) {
  const emitted = new Set([...`${result.stdout}\n${result.stderr}`.matchAll(/^.*?:\d+:\d+ ([a-z][a-z0-9-]*)\b/gm)].map(match => match[1]))
  if (![0, 1].includes(result.status) || ((result.status === 1) !== (emitted.size > 0))) {
    throw new Error(`lint status and diagnostics disagree: ${result.status}: ${result.stderr}`)
  }
  return emitted
}
