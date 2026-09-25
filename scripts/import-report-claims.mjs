/*
 * The `roundtrip` import report says the same thing in every engine.
 *
 * Nothing compared it (carve#2268). Every fixture in tests/html-import/ imports
 * in `safe`, and the fixture contract forbids a fixture declaring its mode -
 * `expected.report.json` IS the report, not a configuration (carve#1886) - so
 * `roundtrip`-only rows had no home. `compare:convert` sweeps the same fixtures
 * across engines but pairs on the RENDERED document, and a report row renders
 * nothing, so it had nothing to pair on either. The existing vocabulary gate
 * sweeps all three modes and checks only which CODES appear.
 *
 * Three engines then described the same raw-kept-element refusals three
 * different ways for an unknown length of time, and it surfaced because someone
 * read one payload: carve-js was silent about a descendant's attributes
 * (carve-js#2021), carve-rs reported two of them as `attribute-dropped` when
 * nothing was dropped (carve#2261), and the third answer was a wording
 * difference nobody had compared.
 *
 * WHAT IS COMPARED: code, severity, fidelity, confidence, path and the message
 * string, in DOCUMENT ORDER. Severity alone would have missed carve-js's
 * silence; codes alone would have missed carve-rs's false rows; order matters
 * because the contract fixes it - the element's own rows, its `raw-preserved`
 * row, then each descendant's rows in document order.
 *
 * WHAT IS NOT: no row is held back. The `style` rows were left out while
 * carve#2267 was unsettled; it is ruled, so their code, class, message and
 * position are compared like every other row's, and the clause the engines have
 * not reached yet is declared in CLAUSE_PENDING below.
 *
 * Needs the sibling engines, so it runs in the conformance workflow rather than
 * in `npm test`, and exits 2 without them: a checker that reports success having
 * run nothing is the failure it exists to prevent.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { phpDir, rustBinary } from './lib/engine-locations.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
// ABSOLUTE, always. `CARVE_JS_DIR` may be relative - the comparison page spells
// it `../carve-js` - and a relative specifier passed to `import()` resolves
// against THIS module's URL, not the working directory `existsSync` uses. The
// two would then disagree: the check finds the sibling build and the import
// looks for it inside the repo. Same reasoning as lib/engine-locations.mjs.
const jsDir = resolve(process.env.CARVE_JS_DIR ?? resolve(root, '../carve-js'))

/*
 * Twenty tags reach the raw-keep path. These three are the ones that carry an
 * axis no other case does; a fourth block or inline tag would re-measure a path
 * already covered.
 *
 * `form` is the only case with two descendants, so it is the only one where
 * document order among them is observable, and the only one carrying both
 * own-attribute kinds. Its `style` pair carries the two classes carve#2267
 * ruled: a denied URL scheme in `url(...)` on the element, benign CSS on a
 * descendant. `output` is the INLINE arm, a separate walk in all three engines.
 * `xmp` is RAWTEXT: its content is character data, so there is no descendant
 * element to report, and the `javascript:` URL in those bytes stays inert
 * because re-parsing returns to RAWTEXT.
 */
const CASES = [
  {
    name: 'form (block arm, two descendants)',
    html: '<form onclick="go()" action="javascript:alert(1)" style="background:url(javascript:alert(4))">'
      + '<a href="javascript:alert(2)" style="color:blue">link</a>'
      + '<button formaction="javascript:alert(3)">go</button></form>\n',
  },
  {
    name: 'output (inline arm)',
    html: '<p><output onclick="go()"><a href="javascript:alert(2)">link</a></output></p>\n',
  },
  {
    name: 'xmp (RAWTEXT, no descendant element)',
    html: '<xmp onclick="go()"><a href="javascript:alert(2)">link</a></xmp>\n',
  },
]

/*
 * Engines known to diverge, each with its ticket.
 *
 * `instead` pairs a row this engine writes with the row the others write in ITS
 * PLACE, substituted where it stands so a declared wording difference cannot
 * also excuse a move; `extra` are rows only this engine emits, and `absent` rows
 * only the others do. Checked in BOTH directions: an engine that stops diverging
 * fails on the stale entry, and a divergence wider than the entry describes
 * fails as an undeclared one. Every other row, and the order of all of them, is
 * still compared - a declaration excuses a row, never a case.
 *
 * Empty, and that is a measurement: carve-rs#1881 (the sink named
 * "active-content") and carve-php#2357 (a refusal reported inside RAWTEXT) both
 * closed, and the checker refused both entries as no longer describing their
 * engine. The machinery stays for the next one.
 */
const DECLARED = []

/*
 * A clause every engine is behind, with the ticket that moves each one.
 *
 * carve#2267 ruled that inside kept bytes a `style` is `attribute-preserved` -
 * `error` for a refused declaration, `info` for benign CSS - and never
 * `style-unmapped`, which names a mapping kept bytes do not run. In all three
 * engines `style` still takes its own branch around the refusal policy, so all
 * three answer `style-unmapped` and none reports a `style` under
 * `attribute-preserved`.
 *
 * Checked in both directions, and deliberately not by row string: an entry
 * naming rows nobody emits would go stale the moment a message changed and
 * could never fire. It asserts the SHAPE of the gap instead - the wrong code
 * present, the ruled code absent - so the first engine to land its fix turns
 * this red and the rows move into the comparison above.
 */
const CLAUSE_PENDING = [
  {
    case: 'form (block arm, two descendants)',
    clause: 'carve#2267',
    tickets: {
      js: 'markup-carve/carve-js#2043',
      php: 'markup-carve/carve-php#2368',
      rs: 'markup-carve/carve-rs#1892',
    },
  },
]

const isStyleUnmapped = (d) => d.code === 'style-unmapped'
const isPreservedStyle = (d) =>
  d.code === 'attribute-preserved' && /\bPreserved style\b/.test(d.message)

const row = (d) => [d.code, d.severity, d.fidelity, d.confidence, d.path ?? '', d.message].join('|')

/*
 * Drops ONE occurrence of each named row. A declaration excuses one row, not
 * every copy of it: an engine that started emitting a declared row twice would
 * pass a filter that removed them all, and a duplicated diagnostic is exactly
 * the kind of report defect this gate exists to see.
 */
/*
 * Replaces ONE occurrence of each pair's first row with its second, WHERE IT
 * STANDS. A declared wording difference must not also excuse a move: dropping
 * both sides of the pair before comparing would lose the position, and document
 * order is part of the contract this gate measures.
 */
function substituteOnce(list, pairs) {
  const out = [...list]
  for (const [from, to] of pairs) {
    const at = out.indexOf(from)
    if (at !== -1) out[at] = to
  }

  return out
}

function withoutOnce(list, removals) {
  const left = [...removals]
  return list.filter((entry) => {
    const at = left.indexOf(entry)
    if (at === -1) return true
    left.splice(at, 1)

    return false
  })
}

const engines = []
if (existsSync(join(jsDir, 'dist/index.js'))) engines.push({ name: 'js', dir: jsDir })
{
  const bin = rustBinary()
  if (bin) engines.push({ name: 'rs', bin, args: [] })
}
if (phpDir() && existsSync(join(phpDir(), 'bin/carve'))) {
  engines.push({ name: 'php', bin: 'php', args: [resolve(phpDir(), 'bin/carve')] })
}

if (engines.length < 3) {
  const found = engines.map((e) => e.name).join(', ') || 'none'
  console.error(`import-report-claims: DID NOT RUN. Need all three engines, found ${engines.length} (${found}).`)
  console.error('A missing checkout is not built, or is not where CARVE_JS_DIR / CARVE_RS_DIR / CARVE_PHP_DIR point.')
  process.exit(2)
}

const lib = await import(join(jsDir, 'dist/index.js'))
const tmp = mkdtempSync(join(tmpdir(), 'carve-import-report-'))

function report(engine, html) {
  if (engine.name === 'js') return lib.htmlToCarve(html, { mode: 'roundtrip' }).report
  const input = join(tmp, 'case.html')
  const out = join(tmp, 'report.json')
  writeFileSync(input, html)
  execFileSync(engine.bin, [...engine.args, 'migrate', '--from', 'html', '--mode', 'roundtrip', '--report', out, input], {
    encoding: 'utf8',
    maxBuffer: 1 << 26,
  })

  return JSON.parse(readFileSync(out, 'utf8'))
}

const failures = []

for (const testCase of CASES) {
  const rows = new Map()
  const styleShape = new Map()
  for (const engine of engines) {
    let payload
    try {
      payload = report(engine, testCase.html)
    } catch (error) {
      failures.push(`${testCase.name}: ${engine.name} did not import: ${error.message.split('\n')[0]}`)
      continue
    }
    // A CLI that ignored --mode would report `attribute-dropped` and fail below
    // anyway; naming it here says which of the two happened.
    if (payload.mode !== 'roundtrip') {
      failures.push(`${testCase.name}: ${engine.name} reported mode "${payload.mode}", not roundtrip.`)
      continue
    }
    const all = payload.diagnostics ?? []
    rows.set(engine.name, all.map(row))
    styleShape.set(engine.name, {
      unmapped: all.filter(isStyleUnmapped).length,
      preserved: all.filter(isPreservedStyle).length,
    })
  }

  if (rows.size < engines.length) continue

  // A vacuous agreement is the failure this gate is most likely to decay into:
  // if the tag stopped being raw-kept, every engine would report nothing and
  // "they agree" would be true and worthless.
  for (const [name, list] of rows) {
    if (!list.some((r) => r.startsWith('raw-preserved|'))) {
      failures.push(`${testCase.name}: ${name} reported no raw-preserved row, so this case no longer reaches the raw-keep path.`)
    } else if (list.length < 2) {
      failures.push(`${testCase.name}: ${name} reported ${list.length} comparable row(s); this case is meant to carry a refusal beside the raw-preserved row.`)
    }
  }

  // Runs ahead of the comparison so a disagreement among the engines cannot
  // also hide which of them is still behind the clause.
  for (const entry of CLAUSE_PENDING.filter((e) => e.case === testCase.name)) {
    for (const [name, shape] of styleShape) {
      const ticket = entry.tickets[name] ?? entry.clause
      if (shape.preserved > 0) {
        failures.push(
          `${testCase.name}: ${name} now reports a style under attribute-preserved, so ${entry.clause} `
            + `is no longer pending for it (${ticket}). Delete it from CLAUSE_PENDING; these rows are gated above.`,
        )
      } else if (shape.unmapped === 0) {
        failures.push(
          `${testCase.name}: ${name} reports neither style-unmapped nor a preserved style, so this case no `
            + `longer measures ${entry.clause} (${ticket}).`,
        )
      } else {
        console.log(`PENDING ${testCase.name}: ${name} answers style-unmapped inside kept bytes; ${entry.clause} asks for attribute-preserved (${ticket})`)
      }
    }
  }

  const declared = DECLARED.filter((entry) => entry.case === testCase.name)
  const undeclaredNames = [...rows.keys()].filter((name) => !declared.some((entry) => entry.engine === name))
  // The agreed reading comes from the engines nothing is declared about, and
  // there must be at least two of them: one engine left cannot arbitrate, and a
  // third declaration would otherwise buy a green run.
  const agreedLists = new Set(undeclaredNames.map((name) => JSON.stringify(rows.get(name))))
  if (undeclaredNames.length < 2) {
    failures.push(`${testCase.name}: ${undeclaredNames.length} engine(s) without a declared divergence; nothing can arbitrate this case.`)
    continue
  }
  if (agreedLists.size > 1) {
    failures.push(`${testCase.name}: ${undeclaredNames.join(', ')} disagree and no divergence is declared for them.`)
    for (const name of undeclaredNames) for (const r of rows.get(name)) failures.push(`    ${name.padEnd(3)} ${r}`)
    continue
  }
  const agreed = rows.get(undeclaredNames[0])

  for (const entry of declared) {
    const actual = rows.get(entry.engine)
    const instead = entry.instead ?? []
    const extra = entry.extra ?? []
    const absent = entry.absent ?? []
    const stale = [
      ...[...instead.map(([from]) => from), ...extra].filter((r) => !actual.includes(r)).map((r) => `no longer emitted by ${entry.engine}: ${r}`),
      ...[...instead.map(([, to]) => to), ...absent].filter((r) => !agreed.includes(r)).map((r) => `not the agreed row: ${r}`),
      ...absent.filter((r) => actual.includes(r)).map((r) => `${entry.engine} emits it after all: ${r}`),
    ]
    if (stale.length > 0) {
      failures.push(
        `${testCase.name}: the declared divergence for ${entry.engine} (${entry.ticket}) no longer describes it. `
          + 'Delete the entry so the rows are gated like every other one.',
      )
      for (const line of stale) failures.push(`    ${line}`)
      continue
    }
    const reduced = withoutOnce(substituteOnce(actual, instead), extra)
    const expected = withoutOnce(agreed, absent)
    if (JSON.stringify(reduced) !== JSON.stringify(expected)) {
      failures.push(`${testCase.name}: ${entry.engine} diverges beyond its declaration (${entry.ticket}).`)
      failures.push(`    declared-aside ${entry.engine}: ${JSON.stringify(reduced)}`)
      failures.push(`    agreed:          ${JSON.stringify(expected)}`)
      continue
    }
    console.log(`DRIFT ${testCase.name}: ${entry.engine} - ${entry.reason} (${entry.ticket})`)
  }

  const undeclaredOk = agreedLists.size === 1
  if (undeclaredOk) {
    console.log(`ok    ${testCase.name}: ${agreed.length} rows agree in ${undeclaredNames.join(' and ')}`)
  }
}

rmSync(tmp, { recursive: true, force: true })

if (failures.length > 0) {
  console.log('')
  for (const line of failures) console.log(line)
  console.error(
    `\n${failures.length} finding(s): the roundtrip import report does not read the same in every engine. `
      + 'Correct the engine, or declare the divergence with its ticket.',
  )
  process.exit(1)
}
console.log(
  `\n${CASES.length} raw-keep cases compared row for row across ${engines.length} engines, `
    + `with ${DECLARED.length} declared divergence(s) and ${CLAUSE_PENDING.length} pending clause(s).`,
)
