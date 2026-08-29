/*
 * Which productions of resources/carve-core.ohm the corpus actually reaches.
 *
 * Two questions, and only the second one is about the corpus:
 *
 *   POSITIVE REACHABILITY is a property of the grammar. A rule mentioned only
 *   inside a NEGATIVE lookahead `~` can never produce a CST node, so no document
 *   can ever "reach" it in the sense measured here. Counting those as coverage
 *   gaps would make the gate report findings no document could ever close.
 *   Ohm's positive lookahead `&` is not the same: it does produce a node, so a
 *   rule reached only that way stays in the question.
 *
 *   CORPUS REACHABILITY is measured by walking the CST of every successful
 *   match. A rule that is positively reachable and that no document reaches is
 *   the real finding: a production nothing exercises.
 */

import * as ohm from 'ohm-js'

/*
 * The start rules the oracle actually matches against: `attrs`, `blockAttrs`
 * and `inlines` from scripts/spec/render.mjs, plus `doc` for the block layer,
 * which the render path never enters (it uses the layout automaton instead) and
 * which would otherwise leave every block production unmeasured.
 */
export const START_RULES = ['doc', 'inlines', 'attrs', 'blockAttrs']

/**
 * Rules reachable from the start rules.
 *
 * `mode: 'positive'` refuses to descend into a `~` lookahead, so it answers
 * which rules can produce a CST node. `mode: 'any'` descends everywhere, so the
 * difference between the two is the rules reachable ONLY under a `~` - and what
 * neither reaches is an orphan, referenced from nothing. Those are three
 * different facts and the gate owes a different answer to each.
 */
export function reachableRules(grammar, { startRules = START_RULES, mode = 'positive' } = {}) {
  const followNegated = mode === 'any'
  const declared = new Set(Object.keys(grammar.rules))
  const seen = new Set()

  const walkExpr = (expr, negated) => {
    if (!expr || typeof expr !== 'object') return
    const kind = expr.constructor.name
    if (kind === 'Apply') {
      if ((!negated || followNegated) && declared.has(expr.ruleName)) visit(expr.ruleName)
      for (const arg of expr.args || []) walkExpr(arg, negated)
      return
    }
    // Only `~` stops production. Ohm's POSITIVE lookahead `&x` does put x in the
    // CST, and this grammar uses it (`&wordChar`, `&tagChar`, `&end`), so
    // treating the two alike would file reachable rules as unreachable.
    const under = negated || kind === 'Not'
    for (const key of ['factors', 'terms', 'expr', 'args']) {
      const value = expr[key]
      if (!value) continue
      for (const child of Array.isArray(value) ? value : [value]) walkExpr(child, under)
    }
  }
  const visit = (name) => {
    if (seen.has(name)) return
    seen.add(name)
    const rule = grammar.rules[name]
    if (rule?.body) walkExpr(rule.body, false)
  }

  for (const name of startRules) {
    if (!declared.has(name)) throw new Error(`start rule ${name} is not declared by the grammar`)
    visit(name)
  }
  return seen
}

/*
 * Records every rule that produces a node in a successful match, by patching
 * the shared Grammar prototype: scripts/spec/render.mjs holds its grammar
 * privately, so there is no other seam into the four matches it runs.
 *
 * `walked` is returned so a caller can tell "no rule was reached" from "the
 * hook never fired". Without it a patch that silently stopped working would
 * report every rule as uncovered, and the reason would not be in the output.
 */
export function recordReachedRules(declared) {
  const reached = new Set()
  const counts = { matched: 0, walked: 0 }
  const probe = ohm.grammar('G { start = "x" }')
  const proto = Object.getPrototypeOf(probe)
  const original = proto.match

  proto.match = function patchedMatch(...args) {
    const result = original.apply(this, args)
    counts.matched++
    if (result?.succeeded?.()) {
      const cst = result._cst
      if (cst) {
        counts.walked++
        const stack = [cst]
        while (stack.length) {
          const node = stack.pop()
          if (!node) continue
          if (node.ctorName && declared.has(node.ctorName)) reached.add(node.ctorName)
          if (node.children) for (const child of node.children) stack.push(child)
        }
      }
    }
    return result
  }

  return { reached, counts, restore: () => { proto.match = original } }
}

/** Rules reachable without passing through a `~`, so able to produce a node. */
export const positivelyReachable = (grammar, startRules = START_RULES) =>
  reachableRules(grammar, { startRules, mode: 'positive' })

/**
 * Splits the declared rules three ways: those a document can reach, those only
 * a `~` mentions, and those nothing references at all. An orphan is not a
 * lookahead exemption - it is a production with no caller, which is the shape
 * the coverage gate exists to surface rather than to waive.
 */
export function classifyRules(grammar, startRules = START_RULES) {
  const declared = new Set(Object.keys(grammar.rules))
  const positive = reachableRules(grammar, { startRules, mode: 'positive' })
  const any = reachableRules(grammar, { startRules, mode: 'any' })
  return {
    positive,
    lookaheadOnly: new Set([...any].filter((r) => !positive.has(r))),
    orphans: new Set([...declared].filter((r) => !any.has(r))),
  }
}
