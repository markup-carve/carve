#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DEFAULT_TARGET, expectedFileFor, targetOf } from './lib/corpus-targets.mjs'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const args = new Set(process.argv.slice(2))
const bench = args.has('--bench')
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
const ALL_TARGETS = ['html', 'markdown', 'plain', 'carve', 'ansi']
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

const impls = [
  {
    name: 'rust',
    cwd: process.env.CARVE_RS_DIR ?? resolve(root, '../carve-rs'),
    prepare: null,
    defaultCommand: (target = 'html') => ['cargo', 'run', '--quiet', '--', ...CLI_FLAGS[target]],
    optionalCommand(feature, target = DEFAULT_TARGET) {
      const flags = CLI_FLAGS[target]
      if (!flags) return null
      if (feature === 'social-link-templates') {
        return [
          'cargo',
          'run',
          '--quiet',
          '--',
          '--mention-url',
          '/users/{name}',
          '--tag-url',
          '/topics/{name}',
          ...flags,
        ]
      }
      if (feature === 'symbol-map') {
        return [
          'cargo', 'run', '--quiet', '--',
          '--symbol', 'rocket=🚀', '--symbol', 'tada=🎉', '--symbol', '+1=👍', '--symbol', 'UPPER=⬆️',
          ...flags,
        ]
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
    cwd: process.env.CARVE_PHP_DIR ?? resolve(root, '../carve-php'),
    prepare: null,
    defaultCommand: (target = 'html') => ['php', 'bin/carve', ...CLI_FLAGS[target]],
    optionalCommand(feature, target = DEFAULT_TARGET) {
      // These adapters drive CarveConverter::convert(), which is the HTML
      // target. Rendering another target needs a different converter factory
      // per case, so an unwired target reports "no adapter" - the same visible
      // skip an unsupported feature gets - rather than comparing this engine's
      // HTML against another engine's Markdown.
      if (target !== 'html') return null
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
      if (feature === 'bare-url-autolink') {
        return [
          'php',
          '-r',
          `
            require 'vendor/autoload.php';
            $converter = new MarkupCarve\\Carve\\CarveConverter();
            $converter->addExtension(new MarkupCarve\\Carve\\Extension\\AutolinkExtension());
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
 * fixture on it (every core-corpus target but html - those are compared
 * engine-against-engine only).
 *
 * A fixture that should exist and does not is a hard error: continuing without
 * it would quietly downgrade a scored case to an engines-agree check.
 */
function expectedFor(pair, target) {
  if (!isOptional && target !== DEFAULT_TARGET) return null
  const path = join(corpusDir, expectedFileFor(pair.slug, target))
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

const stats = Object.fromEntries(
  active.map((i) => [i.name, { ok: 0, mismatch: 0, error: 0, skipped: 0, ms: 0, runnable: 0 }]),
)
let crossImplDiffs = 0
const targetStats = Object.fromEntries(
  activeTargets.map((t) => [t, { compared: 0, diffs: 0, errors: 0 }]),
)

for (const pair of pairs) {
  const pairTargets = targetsFor(pair)
  for (const target of pairTargets) {
    const expected = expectedFor(pair, target)
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
        else stats[impl.name].mismatch++
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
}
console.log(`cross_impl_diffs=${crossImplDiffs}`)

console.log('\nTarget agreement (implementations compared against each other)')
for (const target of activeTargets) {
  const t = targetStats[target]
  const fixtures = isOptional || target === DEFAULT_TARGET ? ' fixtures=yes' : ' fixtures=none'
  console.log(`${target}: compared=${t.compared} diffs=${t.diffs} errors=${t.errors}${fixtures}`)
}
console.log(
  isOptional
    ? 'target_agreement_note=every optional case has an expected-output fixture on the target it pins; the counts here also assert that the implementations agree with each other.'
    : 'target_agreement_note=only html has expected-output fixtures; the other targets assert that the implementations agree with each other.',
)

if (isOptional) {
  console.log('\nOptional feature coverage')
  for (const pair of pairs) {
    const supported = active
      .filter((impl) => commandFor(impl, pair, pair.target))
      .map((impl) => impl.name)
      .join(', ')
    console.log(`${pair.feature} (${pair.target}): ${supported || 'none'}`)
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
