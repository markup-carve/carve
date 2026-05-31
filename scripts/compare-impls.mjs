#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

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

const impls = [
  {
    name: 'rust',
    cwd: process.env.CARVE_RS_DIR ?? resolve(root, '../carve-rs'),
    prepare: null,
    defaultCommand: () => ['cargo', 'run', '--quiet', '--'],
    optionalCommand(feature) {
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
        ]
      }
      if (feature === 'emoji-map') {
        return ['cargo', 'run', '--quiet', '--', '--emoji', 'rocket=🚀', '--emoji', 'tada=🎉']
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
    defaultCommand: () => [
      'node',
      '--input-type=module',
      '-e',
      `
        import { readFileSync } from 'node:fs';
        import { carveToHtml } from './dist/index.js';
        const source = readFileSync(process.argv[1], 'utf8');
        process.stdout.write(carveToHtml(source));
      `,
    ],
    optionalCommand(feature) {
      if (feature === 'social-link-templates') {
        return [
          'node',
          '--input-type=module',
          '-e',
          `
            import { readFileSync } from 'node:fs';
            import { carveToHtml } from './dist/index.js';
            const source = readFileSync(process.argv[1], 'utf8');
            process.stdout.write(carveToHtml(source, {
              mentionUrl: '/users/{name}',
              tagUrl: '/topics/{name}',
            }));
          `,
        ]
      }
      if (feature === 'emoji-map') {
        return [
          'node',
          '--input-type=module',
          '-e',
          `
            import { readFileSync } from 'node:fs';
            import { carveToHtml } from './dist/index.js';
            const source = readFileSync(process.argv[1], 'utf8');
            process.stdout.write(carveToHtml(source, {
              emoji: { rocket: '🚀', tada: '🎉' },
            }));
          `,
        ]
      }
      return null
    },
    hooks: ['afterParse', 'beforeRender', 'inline extension renderer'],
  },
  {
    name: 'php',
    cwd: process.env.CARVE_PHP_DIR ?? resolve(root, '../carve-php'),
    prepare: null,
    defaultCommand: () => ['php', 'bin/carve'],
    optionalCommand(feature) {
      if (feature === 'social-link-templates') {
        return [
          'php',
          '-r',
          `
            require 'vendor/autoload.php';
            $converter = new Carve\\CarveConverter();
            $converter->addExtension(new Carve\\Extension\\MentionsExtension(
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
            $converter = new Carve\\CarveConverter();
            $converter->addExtension(new Carve\\Extension\\SmartQuotesExtension(locale: 'de'));
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
            $converter = new Carve\\CarveConverter();
            $converter->addExtension(new Carve\\Extension\\AutolinkExtension());
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

function commandFor(impl, pair) {
  if (corpusName === 'optional') return impl.optionalCommand(pair.feature)
  return impl.defaultCommand()
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
  if (corpusName !== 'optional') {
    return readdirSync(corpusDir)
      .filter((f) => f.endsWith('.crv'))
      .sort()
      .slice(0, limit)
      .map((f) => ({ slug: basename(f, '.crv'), feature: 'core', file: join(corpusDir, f) }))
  }

  const manifest = JSON.parse(readFileSync(join(corpusDir, 'manifest.json'), 'utf8'))
  return manifest.cases
    .slice(0, limit)
    .map((entry) => ({
      slug: basename(entry.slug),
      feature: entry.feature,
      file: join(corpusDir, `${basename(entry.slug)}.crv`),
    }))
}

const pairs = loadPairs()

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

for (const pair of pairs) {
  const expected = readFileSync(join(corpusDir, `${pair.slug}.html`), 'utf8').trim()
  const outputs = []
  const ran = []

  for (const impl of active) {
    const command = commandFor(impl, pair)
    if (!command) {
      stats[impl.name].skipped++
      continue
    }
    stats[impl.name].runnable++
    const result = run(command, impl.cwd, [pair.file])
    stats[impl.name].ms += result.elapsedMs
    if (!result.ok) {
      stats[impl.name].error++
      outputs.push([impl.name, `ERROR:${result.stderr || result.error || result.status}`])
      ran.push(impl.name)
      continue
    }
    if (result.stdout === expected) stats[impl.name].ok++
    else stats[impl.name].mismatch++
    outputs.push([impl.name, result.stdout])
    ran.push(impl.name)
  }

  const unique = new Set(outputs.map(([, out]) => out))
  if (unique.size > 1) {
    crossImplDiffs++
    console.log(`DIFF ${pair.slug} (${pair.feature}): ${ran.join(', ')}`)
  }
}

console.log('\nImplementation summary')
const profile = corpusName === 'optional' ? 'optional/opt-in' : 'default/no-opt-in'
console.log(`profile=${profile} corpus=${corpusName} corpus_pairs=${pairs.length}`)
for (const impl of active) {
  const s = stats[impl.name]
  const avg = s.runnable ? (s.ms / s.runnable).toFixed(2) : '0.00'
  console.log(
    `${impl.name}: pass=${s.ok}/${s.runnable} mismatch=${s.mismatch} error=${s.error} skipped=${s.skipped} avg_ms=${avg}`,
  )
}
console.log(`cross_impl_diffs=${crossImplDiffs}`)

if (corpusName === 'optional') {
  console.log('\nOptional feature coverage')
  for (const pair of pairs) {
    const supported = active
      .filter((impl) => commandFor(impl, pair))
      .map((impl) => impl.name)
      .join(', ')
    console.log(`${pair.feature}: ${supported || 'none'}`)
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
