/*
 * The graceful-degradation promises are real in EVERY engine, not just the
 * pinned one.
 *
 * `docs/graceful-degradation.md` is normative and quantifies over renderers:
 *
 *   "When an interactive construct is rendered to a non-interactive target, the
 *    renderer MUST preserve the construct's content and structure and may drop
 *    only its interaction."
 *
 * and its table header says the rows reflect "the reference engines' renderer
 * behavior" - plural. `tests/degradation-claims.test.mjs` enforces that page
 * through the single `@markup-carve/carve` build `package.json` pins, so it
 * answers "does carve-js degrade this construct" while the rule it enforces is
 * about every conforming renderer. Any degradation defect that spares carve-js
 * is invisible to it.
 *
 * That was not hypothetical (carve#843). carve-php's static-mode spoiler was
 * byte-identical to its own interactive output - `<details class="spoiler">`
 * with no `open` - so a print engine rendered the disclosure collapsed and the
 * body never reached the page. Two of three engines were right and the gate
 * checked one of the two. The inline form had the same defect and nobody had
 * looked.
 *
 * There is no corpus route to this either. A corpus fixture is rendered in the
 * default mode with no extensions, so it cannot express this input at all; the
 * optional corpus can register an extension but has no static-mode axis. So
 * `compare:impls` never reaches it.
 *
 * WHAT THIS ASSERTS, and why not bytes. Each claim is an OBSERVABLE PROPERTY
 * taken from the page - the content survived, the interaction is gone, the
 * label is still visible - not any engine's exact output. Bytes are what the
 * corpus pins. A property is also the only thing that can be true of all three
 * here: carve-rs has no tabs extension at all, so a `tabs` div falls to the
 * core caption floor and comes out as `<p class="div-label">Install</p>` where
 * carve-js and carve-php emit `<h3 class="tabs-label">Install</h3>`. Both
 * satisfy the page - each panel's label is a visible caption and no content is
 * lost - by different routes, and a byte comparison would report that
 * agreement as a failure.
 *
 * Needs the sibling engines, so it runs in the conformance workflow rather than
 * in `npm test`. Without them it exits 2 rather than 0: a claims checker that
 * reports success having run nothing is the failure it exists to prevent.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { phpDir, rustBinary } from './lib/engine-locations.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const jsDir = process.env.CARVE_JS_DIR ?? resolve(root, '../carve-js')
const page = readFileSync(resolve(root, 'docs/graceful-degradation.md'), 'utf8')

const TABS = [
  ':::: tabs',
  '::: tab [Install]',
  'alpha',
  ':::',
  '::: tab [Usage]',
  'beta',
  ':::',
  '::::',
  '',
].join('\n')

/**
 * A collapsed `<details>` - one carrying no `open` - hides its body in a print
 * engine, which is the exact loss the page's principle forbids. An expanded one
 * is fine; the page keeps a disclosure as `<details open>` on purpose.
 */
const hasCollapsedDisclosure = (html) =>
  [...html.matchAll(/<details\b[^>]*>/g)].some((m) => !/\bopen\b/.test(m[0]))

/**
 * Every claim names the ROW of the page it comes from and quotes it, so a
 * failure points at the sentence to correct rather than leaving someone to find
 * it. `phrase` is checked against the page itself: a row deleted upstream
 * should take its claim with it rather than leave an assertion here defending a
 * promise the page no longer makes.
 *
 * `phrase` must be UNIQUE to its row. A phrase shared across rows ("degrades
 * natively" appears on four) survives the deletion of the row this claim is
 * about, so the check would go on defending a promise the page no longer makes -
 * which is the failure mode it exists to catch.
 *
 * `check` receives the static and interactive HTML for one engine and returns
 * null when the claim holds, or the reason it does not.
 */
const CLAIMS = [
  {
    row: 'Spoiler',
    quote: 'blurred until revealed | revealed | degrades natively (hiding is meaningless offline)',
    phrase: 'hiding is meaningless offline',
    source: '::: spoiler\nhidden text\n:::\n',
    check: (staticHtml, interactive) => {
      if (!staticHtml.includes('hidden text')) return 'the body is missing from the static output'
      if (hasCollapsedDisclosure(staticHtml)) {
        return 'the body is still behind a collapsed <details>, which a print engine renders shut'
      }
      if (staticHtml === interactive) return 'static output is identical to interactive: no interaction was dropped'

      return null
    },
  },
  {
    row: 'Spoiler (inline)',
    quote: 'blurred until revealed | revealed',
    phrase: 'hiding is meaningless offline',
    source: 'a :spoiler[hidden] b\n',
    check: (staticHtml, interactive) => {
      if (!staticHtml.includes('hidden')) return 'the content is missing from the static output'
      // `class="spoiler"` alone IS the blur trigger the host stylesheet keys
      // off, so an inline spoiler that reaches print unchanged is in the HTML
      // and not on the page. The observable is therefore that the marker moved.
      if (staticHtml === interactive) return 'static output is identical to interactive: the blur marker is unchanged'

      return null
    },
  },
  {
    row: 'Disclosure (`details`)',
    quote: 'native `<details open>` - kept, not flattened',
    phrase: 'kept, not flattened',
    source: '::: details "T"\nbody\n:::\n',
    check: (staticHtml) => {
      if (!/<details\b[^>]*\bopen\b/.test(staticHtml)) return 'the disclosure does not carry `open` in static mode'
      if (!staticHtml.includes('<summary>')) return 'the disclosure was flattened: no <summary> survived'
      if (!staticHtml.includes('body')) return 'the body is missing from the static output'

      return null
    },
  },
  {
    row: 'Tabs / code-group',
    quote: "each panel shown in sequence, its `[label]` as a caption heading",
    phrase: 'as a caption heading',
    source: TABS,
    check: (staticHtml) => {
      for (const token of ['Install', 'Usage', 'alpha', 'beta']) {
        if (!staticHtml.includes(token)) return `"${token}" was dropped from the static output`
      }
      // The page allows any caption slot (an <h3>, or the core floor's
      // <p class="div-label">); what it does not allow is a click.
      if (/<input\b/.test(staticHtml)) return 'the static output still carries radio inputs, so the interaction survived'

      return null
    },
  },
  {
    row: 'Mermaid / charts',
    quote: 'diagram source preserved',
    phrase: 'diagram source preserved',
    source: '```mermaid\ngraph TD;\nA-->B;\n```\n',
    check: (staticHtml) => {
      if (!staticHtml.includes('graph TD;')) return 'the diagram source is missing from the static output'
      if (!/<(pre|code)\b/.test(staticHtml)) return 'the diagram source is not in a verbatim element'

      return null
    },
  },
  {
    row: 'Math',
    quote: 'source preserved',
    phrase: 'server-side KaTeX to MathML/HTML',
    source: '$$`E=mc^2`\n',
    check: (staticHtml) => (staticHtml.includes('E=mc^2') ? null : 'the math source is missing from the static output'),
  },
  {
    row: 'Normative rule: unconsumed labels render as captions',
    quote: 'MUST render the label as a visible caption at the start of that div\'s content',
    // The page wraps mid-sentence, so the phrase stops where the line does.
    phrase: 'MUST render the label as a visible',
    source: ':::[First]\nFirst panel.\n:::\n',
    check: (staticHtml) => {
      if (!staticHtml.includes('First panel.')) return 'the body is missing from the static output'
      if (!staticHtml.includes('First')) return 'the grouping label was dropped'
      if (!staticHtml.includes('div-label')) return 'the label is not surfaced as a caption'

      return null
    },
  },
]

const engines = []
if (existsSync(join(jsDir, 'dist/index.js'))) engines.push({ name: 'js', kind: 'js', dir: jsDir })
{
  const bin = rustBinary()
  // carve-rs bundles its interactive extensions behind `--extensions`, which
  // is what makes `--static` able to flatten or degrade them at all.
  if (bin) engines.push({ name: 'rs', kind: 'cli', bin, flags: ['--extensions'] })
}
if (phpDir() && existsSync(join(phpDir(), 'bin/carve'))) {
  // carve-php's CLI registers its bundled interactive extensions for the HTML
  // format itself, so there is no flag to pass.
  engines.push({ name: 'php', kind: 'cli', bin: join(phpDir(), 'bin/carve'), flags: [] })
}

if (engines.length < 3) {
  console.error(
    `degradation-claims: need all three engines, found ${engines.length} (${engines.map((e) => e.name).join(', ') || 'none'}).`,
  )
  console.error('A claims checker that reports success having run nothing is the failure it exists to prevent.')
  process.exit(2)
}

const lib = await import(join(jsDir, 'dist/index.js'))
// The same bundle the two CLIs register, so the comparison is like for like.
const jsExtensions = () => [
  lib.tabs(),
  lib.codeGroup(),
  lib.mathBlock(),
  lib.details(),
  lib.spoiler(),
  lib.mermaid(),
]

const tmp = mkdtempSync(join(tmpdir(), 'carve-degradation-'))

function render(engine, source, mode) {
  if (engine.kind === 'js') return lib.carveToHtml(source, { extensions: jsExtensions(), mode })
  const file = join(tmp, 'case.crv')
  writeFileSync(file, source)
  const args = ['--html', ...(mode === 'static' ? ['--static'] : []), ...engine.flags, file]

  return execFileSync(engine.bin, args, { encoding: 'utf8', maxBuffer: 1 << 26 })
}

let failures = 0
try {
  for (const claim of CLAIMS) {
    if (!page.includes(claim.phrase)) {
      failures++
      console.log(`FAIL ${claim.row}: docs/graceful-degradation.md no longer says "${claim.phrase}"`)
      console.log('     A row deleted upstream should take its claim here with it.')
      continue
    }

    const broken = []
    const outputs = new Map()
    for (const engine of engines) {
      let staticHtml
      let interactive
      try {
        staticHtml = render(engine, claim.source, 'static')
        interactive = render(engine, claim.source, 'interactive')
      } catch (error) {
        broken.push([engine.name, `did not render: ${error.message.split('\n')[0]}`])
        continue
      }
      outputs.set(engine.name, staticHtml)
      const reason = claim.check(staticHtml, interactive)
      if (reason) broken.push([engine.name, reason])
    }

    if (broken.length === 0) {
      console.log(`ok  ${claim.row}: ${claim.quote}`)
      continue
    }
    failures++
    console.log(`FAIL ${claim.row}: ${claim.quote}`)
    console.log(`     source: ${JSON.stringify(claim.source)}`)
    for (const [name, reason] of broken) {
      console.log(`     ${name}: ${reason}`)
      const out = outputs.get(name)
      if (out !== undefined) console.log(`     ${name} static: ${out.replace(/\s+/g, ' ').trim()}`)
    }
  }
} finally {
  rmSync(tmp, { recursive: true, force: true })
}

console.log(`\n${CLAIMS.length - failures}/${CLAIMS.length} degradation claims hold in all ${engines.length} engines.`)
if (failures > 0) {
  console.error(
    `${failures} claim(s) in docs/graceful-degradation.md no longer describe every engine. Correct the engine, or the page.`,
  )
  process.exit(1)
}
