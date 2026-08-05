#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  COMPARISON_TARGETS,
  DEFAULT_TARGET,
  TARGET_EXTENSIONS,
  expectedFileFor,
  targetOf,
} from './lib/corpus-targets.mjs'
import { phpDir, rustDir } from './lib/engine-locations.mjs'
import { miscount, shortfall } from './spec/participants.mjs'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const args = new Set(process.argv.slice(2))
const bench = args.has('--bench')
// Round-trip mode: format each case, then treat that output as a fresh input.
// The formatter emits shapes an author would rarely type - normalized
// indentation, inserted blank lines, escape runs - so its output is exactly
// where the engines are least likely to have been compared (carve#353).
const roundtrip = args.has('--roundtrip')
// Opt-in, so a local run stays informational and CI can be strict. Without it
// this script reports divergences and exits 0, which is why two engines
// disagreeing about a document's canonical form went unnoticed (carve#478).
const failOnDiff = args.has('--fail-on-diff')

// Optional cases that reached fewer than two engines AND carry no recorded
// reason. Gated on below, so a new one cannot join the roll-up unexplained.
let undocumentedUnreachable = []
// Entries in UNREACHABLE_REASONS that describe nothing any more, recorded so the
// gate can fail on them rather than printing into the void.
let staleUnreachable = []
// Every feature the optional manifest names, unsliced - see the note where it is
// filled.
const manifestFeatures = new Set()
const limitArg = process.argv.find((a) => a.startsWith('--limit='))
const limit = limitArg ? Number(limitArg.slice('--limit='.length)) : Infinity
const corpusArg = process.argv.find((a) => a.startsWith('--corpus='))
const corpusName = corpusArg ? corpusArg.slice('--corpus='.length) : 'core'

const corpusDirs = {
  core: 'tests/corpus',
  optional: 'tests/corpus-optional',
}

if (!Object.hasOwn(corpusDirs, corpusName)) {
  console.error(`Unknown corpus "${corpusName}". Use --corpus=core or --corpus=optional.`)
  process.exit(2)
}

const corpusDir = join(root, corpusDirs[corpusName])
const isOptional = corpusName === 'optional'

// Render targets to compare. In the core corpus `html` is the only one with
// expected-output fixtures; the rest are compared ENGINE-AGAINST-ENGINE, because
// byte-identical output across implementations is the invariant that matters and
// committing four more expected files per corpus case would not add to it. In
// the optional corpus each case pins its own target and carries the matching
// expected file (tests/corpus-optional/README.md).
const ALL_TARGETS = COMPARISON_TARGETS
const targetsArg = process.argv.find((a) => a.startsWith('--targets='))
const targetsRequest = targetsArg ? targetsArg.slice('--targets='.length) : 'all'
let targets =
  targetsRequest === 'all'
    ? [...ALL_TARGETS]
    : targetsRequest
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)

const unknownTargets = targets.filter((t) => !ALL_TARGETS.includes(t))
if (unknownTargets.length || targets.length === 0) {
  console.error(
    `Unknown target(s) "${unknownTargets.join(', ')}". Use --targets=all or a comma-separated subset of ${ALL_TARGETS.join(', ')}.`,
  )
  process.exit(2)
}

// In the optional corpus the manifest pins a target per case, so the target set
// is not a free choice: each case runs on the target it pins and `--targets`
// narrows which of those cases run. Forcing every case to html instead - which
// this script did until carve#360 grew Markdown-target cases - pairs a
// Markdown case with a `.html` file that was never written.
let targetNote = ''
if (isOptional) {
  targetNote =
    'optional corpus renders each case on the target its manifest entry pins (html unless stated); --targets filters that set'
}

// Command suffix per target. An empty suffix is the default (HTML) render.
const CLI_FLAGS = {
  html: [],
  markdown: ['--markdown'],
  plain: ['--plain'],
  carve: ['--carve'],
  ansi: ['--ansi'],
}

// carve-js is driven through its API rather than its CLI, matching how the
// html path already worked.
const JS_ENTRY = {
  html: 'carveToHtml',
  markdown: 'carveToMarkdown',
  plain: 'carveToPlainText',
  carve: 'carveToCarve',
  ansi: 'carveToAnsi',
}

/**
 * How to invoke carve-rs: a BUILT binary when one is there, `cargo run` if not.
 *
 * `cargo run` compiles into whatever CARGO_TARGET_DIR points at, and a machine
 * with a shared target directory has more than one checkout of the same package
 * pointing at it. Two of them take turns rebuilding, so a run can measure a
 * binary compiled from a DIFFERENT source tree than the one it names - which is
 * how a clean carve-rs was reported as breaking a PART 11 invariant here, and
 * the finding evaporated when the same document was checked by hand.
 *
 * scripts/ast-conformance.mjs already prefers the built binary and even reports
 * a stale one. This brings the two checkers into line, and makes a CI run use
 * the release build the workflow just produced instead of recompiling in debug.
 */
const rustCarveBinary = (() => {
  const dir = rustDir()
  if (!dir) return null
  for (const candidate of ['target/release/carve', 'target/debug/carve']) {
    if (existsSync(join(dir, candidate))) return `./${candidate}`
  }
  return null
})()

const rustBaseCommand = rustCarveBinary
  ? [rustCarveBinary]
  : ['cargo', 'run', '--quiet', '--']

/*
 * Tier-2 features whose only requirement is that an extension be registered.
 *
 * The optional corpus is 33 documents and the run reached 3 of them, because
 * every case needed a hand-written adapter and only the option-carrying ones
 * had been written (carve#496). Citations alone is 16 of the 33 - the single
 * largest Tier-2 surface, and the one with no cross-engine measurement at all.
 *
 * These need no options, so one table serves both engines that are driven
 * through an inline script. carve-rs is driven through its BINARY and still
 * needs a CLI path; those cases stay unreached there and are reported as such.
 */
const PLAIN_EXTENSION_FEATURES = {
  'citations-numbered': { js: 'citations', php: 'CitationsExtension' },
  'citations-author-date': {
    js: 'citations',
    // Not a plain registration: the fixture pins the author-date style,
    // and registering the extension with its default mode renders the
    // NUMBERED style against it. Caught by the run this table enables.
    jsOptions: "{ mode: 'author-date' }",
    php: 'CitationsExtension',
    phpArgs: "mode: 'author-date'",
  },
  'code-callouts': { js: 'codeCallouts', php: 'CodeCalloutsExtension' },
  details: { js: 'details', php: 'DetailsExtension' },
  spoiler: { js: 'spoiler', php: 'SpoilerExtension' },
  tabs: { js: 'tabs', php: 'TabsExtension' },
  'list-table': { js: 'listTable', php: 'ListTableExtension' },
  'bare-url-autolink': { js: 'autolink', php: 'AutolinkExtension' },
}

/*
 * Optional cases driven by a RENDER OR PARSE OPTION rather than an extension.
 *
 * These are the five #535 named: the extension table above reached everything
 * else. An option is per-engine API, so unlike the extension table this one
 * cannot be shared - it is spelled for carve-js, which is the engine that has
 * the most of them.
 *
 * `33-source-line-after-generated-id` needs BOTH options: its fixture shows the
 * id on the `<h2>`, which is what `sections: false` produces, and the whole
 * point of the case is where the stamp goes relative to that id.
 */
/*
 * Why a case reaches fewer than two engines, where the answer is a missing
 * CAPABILITY rather than a missing adapter.
 *
 * Left out of the reporting entirely, "not compared" reads as a harness
 * backlog. This one is not: the option does not exist in either engine that
 * would have to run it, so writing an adapter is impossible rather than
 * pending, and the fix is in the engine (or in the page that documents an
 * option nobody implemented - carve#560).
 *
 * `section-wrapper-off` and `source-line-after-generated-id` used to live here
 * too, on the strength of "carve-php has no sections switch". carve-php#537
 * added `HtmlRenderer::setSectionWrapping()` and carve-php#679 fixed the id/
 * stamp ordering the second case turns on, so both are wired below instead
 * (carve#535).
 */
const UNREACHABLE_REASONS = {
  'smart-quotes-locale-de':
    'carve-js has no quote-locale option; carve-php has the extension (carve#560)',
}

const JS_OPTION_FEATURES = {
  'smart-typography-off': '{ smartTypography: false }',
  'markdown-typography-source': "{ smartTypography: 'source' }",
  'section-wrapper-off': '{ sections: false }',
  'source-line-after-generated-id': '{ sourceLine: true, sections: false }',
}

const impls = [
  {
    name: 'rust',
    cwd: rustDir(),
    prepare: null,
    defaultCommand: (target = 'html') => [...rustBaseCommand, ...CLI_FLAGS[target]],
    optionalCommand(feature, target = DEFAULT_TARGET) {
      const flags = CLI_FLAGS[target]
      if (!flags) return null
      if (feature === 'social-link-templates') {
        return [
          ...rustBaseCommand,
          '--mention-url',
          '/users/{name}',
          '--tag-url',
          '/topics/{name}',
          ...flags,
        ]
      }
      if (feature === 'symbol-map') {
        return [
          ...rustBaseCommand,
          '--symbol', 'rocket=🚀', '--symbol', 'tada=🎉', '--symbol', '+1=👍', '--symbol', 'UPPER=⬆️',
          ...flags,
        ]
      }
      if (feature === 'smart-typography-off' || feature === 'markdown-typography-source') {
        return [...rustBaseCommand, '--smart-typography', 'source', ...flags]
      }
      return null
    },
    hooks: [
      'inline matcher',
      'block matcher',
      'after_parse',
      'before_render',
      'inline extension renderer',
      'block extension renderer',
    ],
  },
  {
    name: 'js',
    cwd: process.env.CARVE_JS_DIR ?? resolve(root, '../carve-js'),
    prepare: ['npm', 'run', 'build'],
    defaultCommand: (target = 'html') => [
      'node',
      '--input-type=module',
      '-e',
      `
        import { readFileSync } from 'node:fs';
        import { ${JS_ENTRY[target]} } from './dist/index.js';
        const source = readFileSync(process.argv[1], 'utf8');
        process.stdout.write(${JS_ENTRY[target]}(source));
      `,
    ],
    optionalCommand(feature, target = DEFAULT_TARGET) {
      const entry = JS_ENTRY[target]
      if (!entry) return null
      if (feature === 'social-link-templates') {
        return [
          'node',
          '--input-type=module',
          '-e',
          `
            import { readFileSync } from 'node:fs';
            import { ${entry} } from './dist/index.js';
            const source = readFileSync(process.argv[1], 'utf8');
            process.stdout.write(${entry}(source, {
              mentionUrl: '/users/{name}',
              tagUrl: '/topics/{name}',
            }));
          `,
        ]
      }
      if (feature === 'symbol-map') {
        return [
          'node',
          '--input-type=module',
          '-e',
          `
            import { readFileSync } from 'node:fs';
            import { ${entry} } from './dist/index.js';
            const source = readFileSync(process.argv[1], 'utf8');
            process.stdout.write(${entry}(source, {
              symbols: { rocket: '🚀', tada: '🎉', '+1': '👍', UPPER: '⬆️' },
            }));
          `,
        ]
      }
      const options = JS_OPTION_FEATURES[feature]
      if (options) {
        return [
          'node',
          '--input-type=module',
          '-e',
          `
            import { readFileSync } from 'node:fs';
            import { ${entry} } from './dist/index.js';
            const source = readFileSync(process.argv[1], 'utf8');
            process.stdout.write(${entry}(source, ${options}));
          `,
        ]
      }
      const plain = PLAIN_EXTENSION_FEATURES[feature]
      if (plain) {
        return [
          'node',
          '--input-type=module',
          '-e',
          `
            import { readFileSync } from 'node:fs';
            import { ${entry}, ${plain.js} } from './dist/index.js';
            const source = readFileSync(process.argv[1], 'utf8');
            process.stdout.write(${entry}(source, { extensions: [${plain.js}(${plain.jsOptions ?? ''})] }));
          `,
        ]
      }
      return null
    },
    hooks: [
      'inline matcher',
      'block matcher',
      'afterParse',
      'beforeRender',
      'inline extension renderer',
      'block extension renderer',
    ],
  },
  {
    name: 'php',
    cwd: phpDir(),
    prepare: null,
    defaultCommand: (target = 'html') => ['php', 'bin/carve', ...CLI_FLAGS[target]],
    optionalCommand(feature, target = DEFAULT_TARGET) {
      // These adapters drive CarveConverter::convert(), which is the HTML
      // target. Rendering another target needs a different converter factory
      // per case, so an unwired target reports "no adapter" - the same visible
      // skip an unsupported feature gets - rather than comparing this engine's
      // HTML against another engine's Markdown.
      // The Markdown renderer takes its own settings, so a markdown-target
      // case gets its own factory rather than the html one.
      if (target === 'markdown' && feature === 'markdown-typography-source') {
        return [
          'php',
          '-r',
          `
            require 'vendor/autoload.php';
            $renderer = new MarkupCarve\\Carve\\Renderer\\MarkdownRenderer();
            $renderer->setSmartTypography(MarkupCarve\\Carve\\Renderer\\SmartTypographyMode::Source);
            $converter = MarkupCarve\\Carve\\CarveConverter::create(renderer: $renderer);
            echo $converter->convert(file_get_contents($argv[1]));
          `,
        ]
      }
      if (target !== 'html') return null
      if (feature === 'smart-typography-off') {
        return [
          'php',
          '-r',
          `
            require 'vendor/autoload.php';
            $renderer = new MarkupCarve\\Carve\\Renderer\\HtmlRenderer();
            $renderer->setSmartTypography(MarkupCarve\\Carve\\Renderer\\SmartTypographyMode::Source);
            $converter = MarkupCarve\\Carve\\CarveConverter::create(renderer: $renderer);
            echo $converter->convert(file_get_contents($argv[1]));
          `,
        ]
      }
      // carve-php#537 added the opt-out; before it this case had no php
      // adapter to write at all (carve#535).
      if (feature === 'section-wrapper-off') {
        return [
          'php',
          '-r',
          `
            require 'vendor/autoload.php';
            $renderer = new MarkupCarve\\Carve\\Renderer\\HtmlRenderer();
            $renderer->setSectionWrapping(false);
            $converter = MarkupCarve\\Carve\\CarveConverter::create(renderer: $renderer);
            echo $converter->convert(file_get_contents($argv[1]));
          `,
        ]
      }
      // Needs BOTH: the sections opt-out above, and sourceLines - which is a
      // BlockParser constructor argument, not a renderer setting, so this is
      // the one adapter here that builds a custom parser instead of taking
      // CarveConverter::create()'s default. Only correct since carve-php#679
      // fixed the id/stamp ordering the fixture pins (carve#535).
      if (feature === 'source-line-after-generated-id') {
        return [
          'php',
          '-r',
          `
            require 'vendor/autoload.php';
            $parser = new MarkupCarve\\Carve\\Parser\\BlockParser(trackSourceLines: true);
            $renderer = new MarkupCarve\\Carve\\Renderer\\HtmlRenderer();
            $renderer->setSectionWrapping(false);
            $converter = MarkupCarve\\Carve\\CarveConverter::create(parser: $parser, renderer: $renderer);
            echo $converter->convert(file_get_contents($argv[1]));
          `,
        ]
      }
      if (feature === 'social-link-templates') {
        return [
          'php',
          '-r',
          `
            require 'vendor/autoload.php';
            $converter = new MarkupCarve\\Carve\\CarveConverter();
            $converter->addExtension(new MarkupCarve\\Carve\\Extension\\MentionsExtension(
              mentionUrl: '/users/{name}',
              tagUrl: '/topics/{name}',
            ));
            echo $converter->convert(file_get_contents($argv[1]));
          `,
        ]
      }
      if (feature === 'smart-quotes-locale-de') {
        return [
          'php',
          '-r',
          `
            require 'vendor/autoload.php';
            $converter = new MarkupCarve\\Carve\\CarveConverter();
            $converter->addExtension(new MarkupCarve\\Carve\\Extension\\SmartQuotesExtension(locale: 'de'));
            echo $converter->convert(file_get_contents($argv[1]));
          `,
        ]
      }
      const plain = PLAIN_EXTENSION_FEATURES[feature]
      if (plain) {
        return [
          'php',
          '-r',
          `
            require 'vendor/autoload.php';
            $converter = new MarkupCarve\\Carve\\CarveConverter();
            $converter->addExtension(new MarkupCarve\\Carve\\Extension\\${plain.php}(${plain.phpArgs ?? ''}));
            echo $converter->convert(file_get_contents($argv[1]));
          `,
        ]
      }
      return null
    },
    hooks: [
      'inline matcher',
      'block matcher',
      'parsed-document hook',
      'before-render hook',
      'render listeners',
      'converter registration',
    ],
  },
]

function run(cmd, cwd, extraArgs = [], timeout = 15000) {
  const [bin, ...baseArgs] = cmd
  const started = process.hrtime.bigint()
  const result = spawnSync(bin, [...baseArgs, ...extraArgs], {
    cwd,
    encoding: 'utf8',
    timeout,
    maxBuffer: 20 * 1024 * 1024,
  })
  const elapsedMs = Number(process.hrtime.bigint() - started) / 1_000_000
  return {
    ok: result.status === 0,
    status: result.status,
    stdout: (result.stdout ?? '').trim(),
    // Untrimmed, for anything that feeds output back in as input. `trim()`
    // removes Unicode whitespace, U+00A0 among it, so a document ending in a
    // no-break space loses it on the way through -- see the write in the
    // roundtrip pass.
    rawStdout: result.stdout ?? '',
    stderr: (result.stderr ?? '').trim(),
    elapsedMs,
    error: result.error?.message,
  }
}

function commandFor(impl, pair, target = DEFAULT_TARGET) {
  if (isOptional) return impl.optionalCommand(pair.feature, target)
  return impl.defaultCommand(target)
}

function available(impl) {
  if (impl.prepare) {
    const prep = run(impl.prepare, impl.cwd, [], 60000)
    if (!prep.ok) return { ok: false, reason: prep.stderr || prep.error || `exit ${prep.status}` }
  }
  const tmp = mkdtempSync(join(tmpdir(), 'carve-compare-'))
  const file = join(tmp, 'sample.crv')
  writeFileSync(file, '# Hi\n')
  const result = run(impl.defaultCommand(), impl.cwd, [file])
  rmSync(tmp, { recursive: true, force: true })
  return result.ok ? { ok: true } : { ok: false, reason: result.stderr || result.error || `exit ${result.status}` }
}

/**
 * How many cases this corpus OFFERS, independent of what the run loaded. The
 * exact check above compares the two, so a filter that starts dropping cases
 * fails rather than answering a smaller question.
 */
function availableCaseCount() {
  if (!isOptional) {
    return readdirSync(corpusDir).filter((f) => f.endsWith('.crv')).length
  }
  const manifest = JSON.parse(readFileSync(join(corpusDir, 'manifest.json'), 'utf8'))

  return manifest.cases.length
}

function loadPairs() {
  if (!isOptional) {
    return readdirSync(corpusDir)
      .filter((f) => f.endsWith('.crv'))
      .sort()
      .slice(0, limit)
      .map((f) => ({
        slug: basename(f, '.crv'),
        feature: 'core',
        target: DEFAULT_TARGET,
        file: join(corpusDir, f),
      }))
  }

  const manifest = JSON.parse(readFileSync(join(corpusDir, 'manifest.json'), 'utf8'))
  // Every feature the manifest names, before --limit slices it. The stale-reason
  // gate asks "does this entry name a case that exists", which is a question
  // about the corpus and not about the subset this run happens to cover.
  for (const entry of manifest.cases) {
    if (entry.feature) manifestFeatures.add(entry.feature)
  }
  return manifest.cases.slice(0, limit).map((entry) => {
    const slug = basename(entry.slug)
    const target = targetOf(entry)
    // Surfaces a manifest typo here rather than as a confusing missing-file
    // error further down.
    expectedFileFor(slug, target)
    return {
      slug,
      feature: entry.feature,
      target,
      file: join(corpusDir, `${slug}.crv`),
    }
  })
}

const pairs = loadPairs()

/*
 * And how many CASES it saw. Without `--limit` the run must cover the corpus it
 * loaded, so the check is exact; with one it is a floor, and `--limit=0` is a
 * typo rather than a sample size - it used to run the engines over nothing and
 * report `pass=0/0 mismatch=0`.
 */
const casePopulation = Number.isFinite(limit)
  ? shortfall({
      label: 'CASES',
      actual: pairs.length,
      atLeast: 1,
      of: 'case(s)',
      hint: 'Raise --limit, or drop it to compare the whole corpus.',
    })
  : miscount({
      label: 'CASES',
      actual: pairs.length,
      expected: availableCaseCount(),
      of: 'case(s)',
    })
if (casePopulation !== null) {
  console.error(casePopulation)
  process.exit(2)
}

/**
 * Per-target count of cases scored against a FILE, filled as the run walks the
 * corpus. Reported instead of `fixtures=yes/none`, which could not express "some
 * of them".
 */
const fixtureCounts = {}

// In the optional corpus a case runs on the one target its manifest entry pins,
// and `--targets` filters which cases that leaves. In the core corpus every case
// runs on every requested target.
function targetsFor(pair) {
  if (!isOptional) return targets
  return targets.includes(pair.target) ? [pair.target] : []
}

const activeTargets = ALL_TARGETS.filter((target) =>
  isOptional ? pairs.some((pair) => targetsFor(pair).includes(target)) : targets.includes(target),
)

/**
 * The expected output for a pair on a target, or null when the pair has no
 * fixture on it - those are compared engine-against-engine only.
 *
 * A CORE case may pin a non-HTML target by adding the file the pairing rule
 * names (`NN-slug.md`, `.txt`, `.ansi`); absent, that target stays an
 * engines-agree check. This is what gives a Tier-1 rule about the Markdown,
 * plain or terminal output somewhere to live: engine-against-engine agreement
 * is a necessary invariant, not a sufficient one, and it cannot tell "all three
 * are right" from "all three are wrong" - which is the state PART 10 §10a is in
 * (carve#589).
 *
 * A fixture that should exist and does not is a hard error: continuing without
 * it would quietly downgrade a scored case to an engines-agree check.
 */
function expectedFor(pair, target) {
  // `carve` has no expected-output extension on purpose: Carve-source
  // expectations live in tests/corpus-roundtrip/, and a second home would put
  // two files named `NN-slug.crv` in one directory. Asking for a filename here
  // threw `unknown target 'carve'` on the FIRST case of every default run - the
  // early return this replaced never reached the lookup, so extending the
  // fixture rule to the core corpus had to skip it explicitly.
  if (!TARGET_EXTENSIONS[target]) return null
  const optionalPath = join(corpusDir, expectedFileFor(pair.slug, target))
  if (!isOptional && target !== DEFAULT_TARGET) {
    return existsSync(optionalPath) ? readFileSync(optionalPath, 'utf8').trim() : null
  }
  const path = optionalPath
  if (!existsSync(path)) {
    console.error(
      `Missing expected output ${basename(path)} for ${pair.slug} (target ${target}).`,
    )
    process.exit(2)
  }
  return readFileSync(path, 'utf8').trim()
}

const active = []
for (const impl of impls) {
  const status = available(impl)
  if (status.ok) active.push(impl)
  else console.log(`SKIP ${impl.name}: ${status.reason}`)
}

if (active.length === 0) {
  console.error('No implementations are runnable.')
  process.exit(1)
}

/*
 * ONE ENGINE IS NOT A COMPARISON.
 *
 * `active.length === 0` was the only floor, so a run with a single engine did
 * the whole corpus, reported `pass=610/610 mismatch=0`, found zero cross-impl
 * diffs BY CONSTRUCTION, and exited 0. Two missing checkouts is the ordinary
 * state of a fresh environment, which is exactly when someone reads the summary
 * and believes it.
 *
 * The fixture scoring below is still meaningful with one engine - it compares
 * output to a FILE - so this does not abort. It says which half of the run is
 * vacuous, and fails under the same flag CI uses for strictness, the convention
 * the divergence gate already follows (carve#755, variant 2).
 */
const enginePopulation = shortfall({
  label: 'CROSS-ENGINE',
  actual: active.length,
  atLeast: 2,
  of: 'engine(s)',
  hint: 'Fixture scoring below is still valid; every cross-engine claim in this run is not.',
})
if (enginePopulation !== null) {
  console.log(enginePopulation)
  if (failOnDiff) {
    console.error('--fail-on-diff and fewer than two engines: nothing cross-engine was compared.')
    process.exit(1)
  }
}

const stats = Object.fromEntries(
  active.map((i) => [
    i.name,
    { ok: 0, mismatch: 0, error: 0, skipped: 0, ms: 0, runnable: 0, mismatched: [] },
  ]),
)
let crossImplDiffs = 0
const targetStats = Object.fromEntries(
  activeTargets.map((t) => [t, { compared: 0, diffs: 0, errors: 0 }]),
)

for (const pair of pairs) {
  const pairTargets = targetsFor(pair)
  for (const target of pairTargets) {
    const expected = expectedFor(pair, target)
    if (expected !== null && !isOptional && target !== DEFAULT_TARGET) {
      fixtureCounts[target] = (fixtureCounts[target] ?? 0) + 1
    }
    const outputs = []
    const ran = []

    for (const impl of active) {
      const command = commandFor(impl, pair, target)
      if (!command) {
        // Skips are a per-pair property, not a per-target one; counting them
        // once per target would multiply the same gap by the target count.
        if (target === pairTargets[0]) stats[impl.name].skipped++
        continue
      }
      stats[impl.name].runnable++
      const result = run(command, impl.cwd, [pair.file])
      stats[impl.name].ms += result.elapsedMs
      if (!result.ok) {
        stats[impl.name].error++
        targetStats[target].errors++
        outputs.push([impl.name, `ERROR:${result.stderr || result.error || result.status}`])
        ran.push(impl.name)
        continue
      }
      // Scored only where the case has an expected-output fixture: every
      // optional case, and the html target of the core corpus.
      if (expected !== null) {
        if (result.stdout === expected) stats[impl.name].ok++
        else {
          stats[impl.name].mismatch++
          // NAME the case. The summary counted mismatches and printed nothing
          // that said WHICH, so `rust: pass=594/595 mismatch=1` was a number
          // with no way to act on it - every case had to be re-run by hand to
          // find the one. Same defect ast:check had before carve#670.
          stats[impl.name].mismatched.push(`${target} ${pair.slug}`)
        }
      }
      outputs.push([impl.name, result.stdout])
      ran.push(impl.name)
    }

    if (outputs.length < 2) continue
    targetStats[target].compared++

    // `run()` trims, so agreement here means "identical apart from leading and
    // trailing whitespace". That is deliberate and matches the rest of the
    // project: the corpus runner trims too, and the profile parity battery
    // compares trailing-newline-insensitively on the stated grounds that
    // renderers differ on a final `\n` (docs/profiles.md). Comparing untrimmed
    // would report that known, accepted difference on every case and bury the
    // real divergences.

    const unique = new Set(outputs.map(([, out]) => out))
    if (unique.size > 1) {
      targetStats[target].diffs++
      // Every target counts. Counting html alone let a Markdown or ANSI
      // divergence print its DIFF line while the headline said zero, which is
      // the number a reader takes away and the one the docs snapshot pins.
      crossImplDiffs++
      console.log(`DIFF [${target}] ${pair.slug} (${pair.feature}): ${ran.join(', ')}`)
    }
  }
}

// The ORACLE, this repo's own reader. Used below so a writer's output is read by
// something other than the writer - see the cross-read note in the roundtrip
// block. In-process, so it costs nothing next to spawning an engine per case.
const { parse: oracleParse, Refuse } = await import('./spec/layout.mjs')
const { renderDoc: oracleRender } = await import('./spec/html.mjs')

function oracleHtml(source) {
  try {
    return oracleRender(oracleParse(source)).trim()
  } catch (error) {
    if (error instanceof Refuse) return `REFUSED ${error.message}`
    return `ORACLE-ERROR ${error.message}`
  }
}

let roundtripDiffs = 0
let semanticFailures = 0
let idempotenceFailures = 0
let crossReadFailures = 0
let roundtripCompared = 0

if (roundtrip) {
  // Each engine formats the case, then re-renders its own output. The formatted
  // source is a fresh input the corpus never contained, so this doubles the
  // inputs every case covers.
  const tmp = mkdtempSync(join(tmpdir(), 'carve-roundtrip-'))
  try {
    for (const pair of pairs) {
      const rendered = []
      for (const impl of active) {
        const carveCmd = commandFor(impl, pair, 'carve')
        const htmlCmd = commandFor(impl, pair, 'html')
        if (!carveCmd || !htmlCmd) continue

        const formatted = run(carveCmd, impl.cwd, [pair.file])
        if (!formatted.ok) continue

        // fmt(x) written back out as a real file, so each engine re-reads it
        // exactly as it would any other input. This has to be the UNTRIMMED
        // output: trimming would strip a trailing no-break space, and the
        // reparse would then differ for a reason the engine had no part in.
        const once = join(tmp, `${impl.name}-once.crv`)
        const raw = formatted.rawStdout
        writeFileSync(once, raw.endsWith('\n') ? raw : `${raw}\n`)

        const htmlOfFormatted = run(htmlCmd, impl.cwd, [once])
        const htmlOfSource = run(htmlCmd, impl.cwd, [pair.file])
        const formattedTwice = run(carveCmd, impl.cwd, [once])

        // Per-engine properties, reported apart from cross-engine agreement:
        // these are the formatter's own stated invariants (PART 11 section 1),
        // not a disagreement between engines.
        if (htmlOfFormatted.ok && htmlOfSource.ok && htmlOfFormatted.stdout !== htmlOfSource.stdout) {
          semanticFailures++
          console.log(`INVARIANT to_html(fmt(x)) != to_html(x) [${impl.name}] ${pair.slug}`)
        }
        if (formattedTwice.ok && formattedTwice.rawStdout !== formatted.rawStdout) {
          idempotenceFailures++
          console.log(`INVARIANT fmt(fmt(x)) != fmt(x) [${impl.name}] ${pair.slug}`)
        }
        // CROSS-READ. Everything above has the writing engine read its own
        // output, and so does the cross-engine comparison below it: engine A
        // reading A's output against engine B reading B's. Two writers can each
        // emit a form only their own parser accepts and still agree on the
        // rendered HTML, so that combination cannot see it.
        //
        // The oracle reads what this engine wrote. carve-js has the same check
        // in tests/corpus-fmt-cross-read.test.mjs, where its build is already a
        // dependency; this is the half that needs the engine checkouts, which is
        // where carve#710 said it belongs.
        const oracleOfSource = oracleHtml(readFileSync(pair.file, 'utf8'))
        if (!oracleOfSource.startsWith('REFUSED') && !oracleOfSource.startsWith('ORACLE-ERROR')) {
          const oracleOfFormatted = oracleHtml(raw)
          if (oracleOfFormatted !== oracleOfSource) {
            crossReadFailures++
            console.log(`CROSS-READ oracle(fmt(x)) != oracle(x) [${impl.name}] ${pair.slug}`)
          }
        }
        if (htmlOfFormatted.ok) rendered.push([impl.name, htmlOfFormatted.stdout])
      }

      if (rendered.length < 2) continue
      roundtripCompared++
      if (new Set(rendered.map(([, out]) => out)).size > 1) {
        roundtripDiffs++
        console.log(
          `ROUNDTRIP DIFF ${pair.slug} (${pair.feature}): ${rendered.map(([name]) => name).join(', ')}`,
        )
      }
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true })
  }
}

console.log('\nImplementation summary')
const profile = corpusName === 'optional' ? 'optional/opt-in' : 'default/no-opt-in'
console.log(
  `profile=${profile} corpus=${corpusName} corpus_pairs=${pairs.length} targets=${activeTargets.join(',')}`,
)
if (targetNote) console.log(`target_note=${targetNote}`)
// A `--targets` subset can exclude a case's pinned target outright. Saying so
// keeps corpus_pairs from reading as "all of these ran".
const filteredOut = pairs.filter((pair) => targetsFor(pair).length === 0)
if (filteredOut.length) {
  console.log(
    `filtered_out=${filteredOut.length} (pinned targets outside --targets: ${[...new Set(filteredOut.map((p) => p.target))].join(',')})`,
  )
}
for (const impl of active) {
  const s = stats[impl.name]
  const avg = s.runnable ? (s.ms / s.runnable).toFixed(2) : '0.00'
  // pass/mismatch score the fixtures only, so they are reported against the
  // pair count rather than the run count (which spans every target).
  console.log(
    `${impl.name}: pass=${s.ok}/${s.ok + s.mismatch} mismatch=${s.mismatch} error=${s.error} skipped=${s.skipped} runs=${s.runnable} avg_ms=${avg}`,
  )
  // NAME the mismatching cases. `rust: pass=594/595 mismatch=1` was a number
  // with nothing to act on: the run took twenty minutes and finding the one
  // case meant re-running every fixture by hand. Same defect ast:check had
  // before carve#670.
  for (const name of s.mismatched.slice(0, 10)) console.log(`  mismatch: ${name}`)
  if (s.mismatched.length > 10) {
    console.log(`  ... and ${s.mismatched.length - 10} more`)
  }
}
console.log(`cross_impl_diffs=${crossImplDiffs}`)
if (roundtrip) {
  // Reported apart from the target-agreement block above: the first line is a
  // cross-engine disagreement, the other two are each engine failing its own
  // stated invariant.
  console.log(
    `roundtrip_compared=${roundtripCompared} roundtrip_diffs=${roundtripDiffs} semantic_failures=${semanticFailures} idempotence_failures=${idempotenceFailures} cross_read_failures=${crossReadFailures}`,
  )
}

console.log('\nTarget agreement (implementations compared against each other)')
for (const target of activeTargets) {
  const t = targetStats[target]
  // How many of this target's cases were scored against a FILE rather than
  // against the other engines. `yes` and `none` were the only two answers while
  // html was the only core target with fixtures; a core case may now add one
  // per target, so the honest report is the count.
  const scored = fixtureCounts[target] ?? 0
  const fixtures =
    isOptional || target === DEFAULT_TARGET
      ? ' fixtures=yes'
      : scored > 0
        ? ` fixtures=${scored}`
        : ' fixtures=none'
  console.log(`${target}: compared=${t.compared} diffs=${t.diffs} errors=${t.errors}${fixtures}`)
}
console.log(
  isOptional
    ? 'target_agreement_note=every optional case has an expected-output fixture on the target it pins; the counts here also assert that the implementations agree with each other.'
    : 'target_agreement_note=html has an expected-output fixture per case; another target has one wherever a case added it (fixtures=N), and asserts engine agreement everywhere else.',
)

if (isOptional) {
  console.log('\nOptional feature coverage')
  const unreachable = new Map()
  for (const pair of pairs) {
    const supported = active
      .filter((impl) => commandFor(impl, pair, pair.target))
      .map((impl) => impl.name)
    console.log(`${pair.feature} (${pair.target}): ${supported.join(', ') || 'none'}`)
    // Fewer than two engines means there is nothing to compare AGAINST, so the
    // case contributes no agreement evidence even when it renders.
    if (supported.length < 2) {
      unreachable.set(pair.feature, (unreachable.get(pair.feature) ?? 0) + 1)
    }
  }

  // A "0 differences" line under a run that compared 2 of 33 documents reads
  // exactly like one that compared all of them. It is the same shape as the
  // NOT MEASURED roll-up in ast-conformance.mjs, and for the same reason: the
  // number that matters is how much was checked, not how much disagreed.
  //
  // The Tier-2 features are IMPLEMENTED in all three engines - citations, code
  // callouts and the rest all shipped engine by engine. What is missing is a
  // way to turn them on from the command line, which is the only interface
  // this checker has (markup-carve/carve#496).
  const skippedCases = [...unreachable.values()].reduce((n, x) => n + x, 0)
  if (skippedCases > 0) {
    const worst = [...unreachable.entries()].sort((a, b) => b[1] - a[1])
    console.log(
      `\nNOT COMPARED: ${skippedCases} of ${pairs.length} optional cases reached fewer than two engines, so they contribute no agreement evidence. This is not a pass.`,
    )
    console.log(
      `  fewer than two engines: ${worst.map(([f, n]) => `${f} (${n})`).join(', ')}`,
    )
    // WHY a case is unreachable decides who fixes it, and the roll-up used to
    // say "no CLI path" for all of them - which was true of none of these five.
    // Three are capability gaps: an engine does not have the option at all, so
    // no adapter can be written until it does (carve#560).
    for (const [feature] of worst) {
      const reason = UNREACHABLE_REASONS[feature]
      if (reason) console.log(`    ${feature}: ${reason}`)
    }
    // A case with no reason printed NOTHING, which made it indistinguishable
    // from a documented one in the roll-up above - the whole point of carve#535
    // was that "fewer than two engines" needs a why attached, and a silent
    // entry is exactly the state that issue found. Undocumented is louder than
    // documented on purpose, and it is recorded for the gate below.
    undocumentedUnreachable = worst
      .filter(([feature]) => !UNREACHABLE_REASONS[feature])
      .map(([feature, n]) => ({ feature, engines: n }))
    for (const { feature, engines } of undocumentedUnreachable) {
      console.log(
        `    UNDOCUMENTED  ${feature}: reached ${engines} engine(s) and nothing says why.`,
      )
      console.log(
        `                  Add it to UNREACHABLE_REASONS with the reason - a missing`,
      )
      console.log(
        `                  ADAPTER is this repo's backlog, a missing ENGINE OPTION is not.`,
      )
    }
    // An entry that no longer describes anything is the same defect one level
    // up: the reason list exists so "fewer than two engines" carries a why, and
    // a line that exempts nothing reads as knowledge while stating none. Two
    // ways it can go dead, both recorded for the gate below.
    // A LIMITED run covers a slice, so "this feature reached two engines" is not
    // knowable from it and a documented entry outside the slice is not stale.
    // Skipped rather than guessed, and printed so the skip is visible.
    staleUnreachable = limit === Infinity
      ? Object.keys(UNREACHABLE_REASONS).filter((feature) => !unreachable.has(feature))
      : []
    if (limit !== Infinity) {
      console.log(
        `    (--limit=${limit}: the stale-reason check needs the whole corpus, so it did not run)`,
      )
    }
    for (const feature of staleUnreachable) {
      const known = manifestFeatures.has(feature)
      console.log(
        `    STALE  ${feature}: ${
          known
            ? 'now reaches at least two engines - delete the entry so the case is compared like the rest.'
            : 'names no case in this corpus - renamed or removed, so the entry exempts nothing.'
        }`,
      )
    }
  } else {
    console.log('\nAll optional cases reached at least two engines.')
    if (limit === Infinity) {
      staleUnreachable = Object.keys(UNREACHABLE_REASONS)
      for (const feature of staleUnreachable) {
        console.log(
          `    STALE  ${feature}: every case reached two engines, so this entry exempts nothing.`,
        )
      }
    }
  }
}

console.log('\nExtension capability matrix')
for (const impl of active) {
  console.log(`${impl.name}: ${impl.hooks.join(', ')}`)
}

console.log(
  corpusName === 'optional'
    ? 'extension_profile_note=optional Tier-2 cases run only where an implementation exposes the matching adapter.'
    : 'extension_profile_note=this run compares default/no-opt-in output. Use --corpus=optional for Tier-2 opt-in adapters.',
)

if (bench) {
  console.log('\nBenchmark note: timings include process startup and are useful for CLI-level smoke comparison only.')
}

// The gate. In roundtrip mode a diff means an engine's formatter changed what a
// document says, which is wrong under any reading of PART 11 - there is no
// design question behind it. In the default mode a diff means the engines
// disagree about a target's output; whether every one of those is a defect is
// still open (carve#474), so gate that mode only once they are resolved.
if (failOnDiff) {
  const failing = roundtrip ? roundtripDiffs : crossImplDiffs
  const label = roundtrip ? 'round-trip' : 'cross-implementation'
  // PART 11 §1's own invariants gate too, and separately from cross-engine
  // agreement. `to_html(fmt(x)) != to_html(x)` means ONE engine's formatter
  // changed what the document says - a corruption whether or not the others
  // agree with it, and the engines agreeing on a wrong answer is the case this
  // catches that a diff count cannot. They were counted and printed here from
  // the start and never gated on, so the check could report a formatter
  // rewriting documents and still exit 0.
  const invariantFailures = roundtrip ? semanticFailures + idempotenceFailures : 0
  // A CROSS-READ failure is the same class as an invariant failure - one engine's
  // formatter wrote a form a different reader does not agree with - and it is
  // gated for the reason the comment above gives: a count that is printed and
  // never gated on is a check that cannot fail.
  const crossRead = roundtrip ? crossReadFailures : 0
  // A MISMATCH is an engine disagreeing with a FIXTURE, and it was counted,
  // printed in the summary and never gated on: the run exited 0 while the
  // summary said `js: pass=545/547 mismatch=2`. Cross-engine agreement was the
  // only failing condition, so the one thing a fixture exists to catch - an
  // engine wrong where the corpus says what right is - could not fail the job.
  const mismatches = roundtrip
    ? 0
    : active.reduce((total, impl) => total + stats[impl.name].mismatch, 0)
  if (staleUnreachable.length > 0) {
    console.error(
      `\n${staleUnreachable.length} UNREACHABLE_REASONS entr(ies) describe nothing any more: ` +
        `${staleUnreachable.join(', ')}.`,
    )
    console.error(
      'Delete them. An exemption that exempts nothing is indistinguishable from one that works.',
    )
    process.exit(1)
  }
  if (undocumentedUnreachable.length > 0) {
    console.error(
      `\n${undocumentedUnreachable.length} optional case(s) reached fewer than two engines with no ` +
        `recorded reason: ${undocumentedUnreachable.map((u) => u.feature).join(', ')}.`,
    )
    console.error(
      'Record why in UNREACHABLE_REASONS. Not compared is allowed; not compared and unexplained is not.',
    )
    process.exit(1)
  }
  if (failing > 0 || invariantFailures > 0 || mismatches > 0 || crossRead > 0) {
    if (failing > 0) {
      console.error(`\n${failing} ${label} difference(s) - see the DIFF lines above.`)
    }
    if (mismatches > 0) {
      console.error(
        `${mismatches} case(s) where an engine disagrees with the expected output - see the per-engine mismatch counts above.`,
      )
    }
    if (invariantFailures > 0) {
      console.error(
        `${invariantFailures} PART 11 §1 invariant failure(s) - see the INVARIANT lines above.`,
      )
    }
    if (crossRead > 0) {
      console.error(
        `${crossRead} case(s) where the executable spec reads an engine's formatted output ` +
          `differently from its source - see the CROSS-READ lines above.`,
      )
    }
    process.exit(1)
  }
  console.log(
    `\nNo ${label} differences, no fixture mismatches, no PART 11 §1 invariant failures` +
      `${roundtrip ? ', and no cross-read failures' : ''}.`,
  )
}
