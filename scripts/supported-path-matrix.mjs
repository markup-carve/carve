#!/usr/bin/env node
// Exercise each public CLI import/render combination with paired controls.
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { phpDir, rustBinary, rustDir } from './lib/engine-locations.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
function treeHash(base, paths) {
  const hash = createHash('sha256')
  const walk = path => {
    const absolute = resolve(base, path)
    if (statSync(absolute).isDirectory()) for (const name of readdirSync(absolute).sort()) walk(join(path, name))
    else { hash.update(path); hash.update('\0'); hash.update(readFileSync(absolute)) }
  }
  for (const path of paths) walk(path)
  return hash.digest('hex')
}
const sibling = name => resolve(root, '..', name)
const engines = {
  js: { cwd: process.env.CARVE_JS_DIR || sibling('carve-js'), command: 'node', prefix: ['dist/cli.js'] },
  php: { cwd: phpDir(), command: 'php', prefix: ['bin/carve'] },
  rs: { cwd: rustDir(), command: process.env.CARVE_RS_BIN || rustBinary(), prefix: [] },
}
if (!engines.rs.command) throw new Error('A checkout-matching Rust binary is required')
const sources = ['carve', 'html', 'markdown', 'djot', 'bbcode', 'ast-json']
const targets = ['html', 'markdown', 'plain', 'ansi', 'carve', 'json']
const token = 'MatrixSignal'
const featureCases = {
  table: `| head |\n|---|\n| ${token} |\n`,
  caption: `::: figure\n![image](image.png)\n:::\n^ ${token}\n`,
  abbreviation: `*[${token}]: Expanded name\n\n${token}.\n`,
  math: `A $\`${token}\` term.\n`,
  literal: `A \`${token}\` term.\n`,
}
const importFeatures = {
  'HTML attributes': ['html', `<p id="matrix">${token}</p>`],
  'HTML denied URL': ['html', `<a href="javascript:alert(1)">${token}</a>`],
  'HTML empty mark': ['html', `<strong></strong>${token}`],
  'HTML table': ['html', `<table><tr><td>${token}</td></tr></table>`],
  'HTML nested containers': ['html', `<blockquote><div><blockquote><p>${token}</p></blockquote></div></blockquote>`],
  'BBCode URL attribute': ['bbcode', `[url=https://example.test]${token}[/url]`],
  'BBCode URL render denial': ['bbcode', `[url=javascript:alert(1)]${token}[/url]`],
  'BBCode empty mark': ['bbcode', `[b][/b]${token}`],
  'BBCode table': ['bbcode', `[table][tr][td]${token}[/td][/tr][/table]`],
  'BBCode nested quote': ['bbcode', `[quote][quote]${token}[/quote][/quote]`],
}
const commit = engine => spawnSync('git', ['rev-parse', '--short=8', 'HEAD'], { cwd: engine.cwd, encoding: 'utf8' }).stdout.trim()
const status = engine => spawnSync('git', ['status', '--porcelain', '--untracked-files=no'], { cwd: engine.cwd, encoding: 'utf8' }).stdout.trim() || 'clean'
const pinnedCommits = { js: '94fd3bb1', php: '162f1c69', rs: 'bf67f3c6' }
const measuredBuilds = JSON.parse(readFileSync(resolve(root, 'docs/import-render-growth.json'), 'utf8')).builds
for (const [name, engine] of Object.entries(engines)) {
  if (commit(engine) !== pinnedCommits[name]) throw new Error(`${name}: checkout differs from the pinned matrix commit`)
  if (status(engine) !== 'clean' && !/^(M spec|M tests\/spec)$/.test(status(engine))) throw new Error(`${name}: checkout has source changes outside the spec submodule`)
  const artifactHash = name === 'js' ? treeHash(engine.cwd, ['dist']) :
    name === 'php' ? treeHash(engine.cwd, ['bin/carve', 'composer.lock', 'src']) :
    createHash('sha256').update(readFileSync(engine.command)).digest('hex')
  if (artifactHash !== measuredBuilds[name].artifactHash) throw new Error(`${name}: engine artifact differs from the measured build`)
}
const positive = {
  carve: `*${token}*\n`, html: `<strong>${token}</strong>\n`,
  markdown: `**${token}**\n`, djot: `*${token}*\n`, bbcode: `[b]${token}[/b]\n`,
}
function invoke(engine, args, input) {
  const result = spawnSync(engine.command, [...engine.prefix, ...args], {
    cwd: engine.cwd, input, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024,
  })
  return { status: result.status, stdout: result.stdout || '', stderr: result.stderr || '', error: result.error?.message }
}
function imported(engine, source, input) {
  return source === 'carve' ? { status: 0, stdout: input } :
    source === 'ast-json' ? { status: 0, stdout: input } :
    invoke(engine, ['migrate', '--from', source], input)
}
function render(engine, source, target, input) {
  return invoke(engine, [...(source === 'ast-json' ? ['--from-json'] : []), `--${target}`], input)
}
function strongShape(target, output) {
  if (target === 'html') return /<strong(?:\s[^>]*)?>MatrixSignal<\/strong>/.test(output)
  if (target === 'markdown') return output.includes(`**${token}**`)
  if (target === 'carve') return output.includes(`*${token}*`)
  if (target === 'ansi') return output.includes('\x1b[')
  if (target === 'json') {
    try { return JSON.stringify(JSON.parse(output)).includes('"type":"strong"') }
    catch { return false }
  }
  return true
}
const lines = [
  '---',
  'description: CLI import and render paths tested across the JavaScript, PHP, and Rust implementations.',
  '---', '',
  '# Supported CLI paths', '',
  'The path and control tables are generated by `node scripts/supported-path-matrix.mjs --write`. Set `CARVE_RS_BIN` to the matching Rust binary when automatic discovery finds another build. Each path checks a marked strong span and an empty input control. `yes` means both commands exit successfully and the target retains the marker with its expected form. `partial` means a command runs but an assertion fails; `no` means a command fails. The inventory, known gaps and focused check counts are audit notes recorded at the pinned commits.', '',
  `Engine commits: JavaScript \`${commit(engines.js)}\`, PHP \`${commit(engines.php)}\`, Rust \`${commit(engines.rs)}\`. The script checks each engine artifact against the hashes in [the growth data](import-render-growth.json) and refuses other commits until the controls and known gaps are reviewed. The Rust growth measurements used a debug build.`, '',
  `Tracked checkout status: JavaScript \`${status(engines.js)}\`, PHP \`${status(engines.php)}\`, Rust \`${status(engines.rs)}\`. Only spec submodule checkouts differ from their pinned gitlinks.`, '',
  '| Source | Target | JavaScript | PHP | Rust |', '|---|---|---|---|---|',
]
const details = []
for (const source of sources) {
  for (const target of targets) {
    const cells = []
    for (const [name, engine] of Object.entries(engines)) {
      const ast = source === 'ast-json' ? invoke(engine, ['--json'], positive.carve) : null
      const input = source === 'ast-json' ? ast.stdout : positive[source]
      const prepared = imported(engine, source, input)
      const emptyAst = source === 'ast-json' ? invoke(engine, ['--json'], '') : null
      const negative = imported(engine, source, source === 'ast-json' ? emptyAst.stdout : '')
      const good = prepared.status === 0 ? render(engine, source, target, prepared.stdout) : prepared
      const bad = negative.status === 0 ? render(engine, source, target, negative.stdout) : negative
      let jsonValid = true
      if (target === 'json') {
        try { jsonValid = [good, bad].every(x => JSON.parse(x.stdout).type === 'document') }
        catch { jsonValid = false }
      }
      const status = [ast, emptyAst, prepared, negative, good, bad].filter(Boolean).some(x => x.status !== 0 || x.error) ? 'no' :
        good.stdout.includes(token) && !bad.stdout.includes(token) && jsonValid && strongShape(target, good.stdout) ? 'yes' : 'partial'
      cells.push(status)
      if (status !== 'yes') details.push({ source, target, engine: name, status, positiveExit: good.status, negativeExit: bad.status, positiveMarker: good.stdout.includes(token), negativeMarker: bad.stdout.includes(token), stderr: (good.stderr || bad.stderr).slice(0, 200) })
    }
    lines.push(`| ${source} | ${target} | ${cells.join(' | ')} |`)
  }
}
const lossInput = '```=html\n<strong>MatrixSignal</strong>\n```\n'
const lossCells = []
const positionCells = []
const malformedCells = []
const depthCells = []
const formatterCells = []
const reportCells = []
const roundtripCells = { html: [], markdown: [] }
for (const engine of Object.values(engines)) {
  const positive = invoke(engine, ['--plain', '--report-losses', '-'], lossInput)
  const negative = invoke(engine, ['--html', '--report-losses', '-'], lossInput)
  const strict = invoke(engine, ['--plain', '--strict-losses'], lossInput)
  lossCells.push(positive.status === 0 && positive.stderr.includes('raw-format-dropped') &&
    !positive.stdout.includes(token) && negative.status === 0 &&
    negative.stdout.includes(token) && /"totalLosses"\s*:\s*0/.test(negative.stderr) &&
    strict.status === 1 && !strict.stdout.includes(token) ? 'yes' : 'partial')
  const positioned = invoke(engine, ['--json'], '# MatrixSignal\n\nbody\n')
  let positionValid = false
  try {
    const ast = JSON.parse(positioned.stdout)
    positionValid = ast.children[0].pos.startLine === 1 && ast.children[1].pos.startLine === 3
  } catch { /* A malformed AST is a failed control. */ }
  positionCells.push(positioned.status === 0 && positionValid ? 'yes' : 'partial')
  const malformed = invoke(engine, ['--from-json', '--html'], '{}')
  malformedCells.push(malformed.status !== 0 && malformed.stdout === '' ? 'yes' : 'partial')
  let deepNode = { type: 'paragraph', children: [{ type: 'text', value: token }] }
  for (let i = 0; i < 700; i++) deepNode = { type: 'div', children: [deepNode] }
  const tooDeep = invoke(engine, ['--from-json', '--html'], JSON.stringify({ type: 'document', srcByteLength: 0, children: [deepNode] }))
  depthCells.push(tooDeep.status !== 0 && tooDeep.stdout === '' && /depth|nest/i.test(tooDeep.stderr) ? 'yes' : 'partial')
  const canonical = invoke(engine, ['fmt'], '# MatrixSignal\n\nbody\n')
  const canonicalAgain = invoke(engine, ['fmt'], canonical.stdout)
  const malformedSource = invoke(engine, ['fmt'], '[MatrixSignal](\n')
  const malformedAgain = invoke(engine, ['fmt'], malformedSource.stdout)
  formatterCells.push([canonical, canonicalAgain, malformedSource, malformedAgain].every(x => x.status === 0) &&
    canonical.stdout === canonicalAgain.stdout && malformedSource.stdout === malformedAgain.stdout &&
    canonical.stdout.includes(token) && malformedSource.stdout.includes(token) ? 'yes' : 'partial')
  const exact = invoke(engine, ['migrate', '--from', 'markdown', '--report', '-'], 'hello')
  const fallback = invoke(engine, ['migrate', '--from', 'bbcode', '--report', '-'], `[b]${token}[/b]`)
  let reportValid = false
  try {
    const a = JSON.parse(exact.stderr)
    const b = JSON.parse(fallback.stderr)
    reportValid = a.schemaVersion === 2 && a.sourceFormat === 'markdown' &&
      a.diagnostics.some(x => x.code === 'literal-text-verified' && x.fidelity === 'preserved' && x.confidence === 'exact') &&
      b.schemaVersion === 2 && b.sourceFormat === 'bbcode' &&
      b.diagnostics.some(x => x.code === 'fidelity-unverified' && x.fidelity === 'dropped' && x.confidence === 'fallback')
  } catch { /* A malformed report is a failed control. */ }
  reportCells.push(exact.status === 0 && fallback.status === 0 && reportValid ? 'yes' : 'partial')
  for (const target of ['html', 'markdown']) {
    const exported = invoke(engine, [`--${target}`, '--roundtrip'], `* ${token}\n`)
    const importedBack = exported.status === 0 ?
      (target === 'html' ? invoke(engine, ['migrate', '--from', 'html', '--mode', 'roundtrip'], exported.stdout) : imported(engine, target, exported.stdout)) : exported
    const emptyExport = invoke(engine, [`--${target}`, '--roundtrip'], '')
    const emptyImport = emptyExport.status === 0 ?
      (target === 'html' ? invoke(engine, ['migrate', '--from', 'html', '--mode', 'roundtrip'], emptyExport.stdout) : imported(engine, target, emptyExport.stdout)) : emptyExport
    const carrierPresent = target !== 'html' || exported.stdout.includes('data-marker')
    roundtripCells[target].push([exported, importedBack, emptyExport, emptyImport].every(x => x.status === 0) &&
      importedBack.stdout.startsWith(`* ${token}`) && !emptyImport.stdout.includes(token) && carrierPresent ? 'yes' : 'partial')
  }
}
lines.push('', '## Failing controls', '', details.length ? '```json\n' + JSON.stringify(details, null, 2) + '\n```' : 'None.', '')
lines.push('## Render loss control', '',
  'A raw HTML block renders in HTML, reports `raw-format-dropped` in plain text, and is refused by strict plain text rendering.', '',
  '| Control | JavaScript | PHP | Rust |', '|---|---|---|---|',
  `| Raw block and strict loss gate | ${lossCells.join(' | ')} |`, '')
lines.push('## AST controls', '',
  '| Control | JavaScript | PHP | Rust |', '|---|---|---|---|',
  `| Heading and paragraph source lines | ${positionCells.join(' | ')} |`,
  `| Malformed AST refusal without output | ${malformedCells.join(' | ')} |`,
  `| Excess AST depth refused without output | ${depthCells.join(' | ')} |`, '')
lines.push('## Formatter control', '',
  'A heading and a malformed link both reach a stable canonical form on the second pass.', '',
  '| Control | JavaScript | PHP | Rust |', '|---|---|---|---|',
  `| Canonical fixed point | ${formatterCells.join(' | ')} |`, '')
lines.push('## Import confidence controls', '',
  'A plain Markdown literal reports exact confidence. A marked BBCode construct reports the unsupported assessment as fallback. The shared report schema calls the middle confidence level `inferred`.', '',
  '| Control | JavaScript | PHP | Rust |', '|---|---|---|---|',
  `| Exact and fallback report states | ${reportCells.join(' | ')} |`, '')
lines.push('## Roundtrip export controls', '',
  'A star bullet is exported and imported again. HTML must carry its marker. Empty input is the negative control.', '',
  '| Target | JavaScript | PHP | Rust |', '|---|---|---|---|',
  `| HTML | ${roundtripCells.html.join(' | ')} |`,
  `| Markdown | ${roundtripCells.markdown.join(' | ')} |`, '')
lines.push('## Render feature controls', '',
  'Each feature uses a Carve document carrying the marker. The negative control is empty input. These checks establish that the marked content reaches each target; they do not assert target-specific structure.', '',
  '| Feature | Target | JavaScript | PHP | Rust |', '|---|---|---|---|---|')
for (const [feature, source] of Object.entries(featureCases)) for (const target of targets) {
  const cells = Object.values(engines).map(engine => {
    const positive = render(engine, 'carve', target, source)
    const negative = render(engine, 'carve', target, '')
    return positive.status === 0 && positive.stdout.includes(token) &&
      negative.status === 0 && !negative.stdout.includes(token) ? 'yes' : 'partial'
  })
  lines.push(`| ${feature} | ${target} | ${cells.join(' | ')} |`)
}
lines.push('')
lines.push('## Import feature controls', '',
  'Each case imports the marked source and renders the result to HTML. Empty input is its negative control. A `yes` checks retained text and the relevant attribute, table, quote or denied URL shape. The focused contract checks cover detailed reports.', '',
  '| Control | JavaScript | PHP | Rust |', '|---|---|---|---|')
for (const [feature, [source, input]] of Object.entries(importFeatures)) {
  const cells = Object.values(engines).map(engine => {
    const positive = imported(engine, source, input)
    const negative = imported(engine, source, '')
    const rendered = positive.status === 0 ? render(engine, 'carve', 'html', positive.stdout) : positive
    const empty = negative.status === 0 ? render(engine, 'carve', 'html', negative.stdout) : negative
    const deniedUrlSafe = feature === 'HTML denied URL' ?
      !positive.stdout.includes('javascript:') && !/href=["']javascript:/i.test(rendered.stdout) :
      feature === 'BBCode URL render denial' ? positive.stdout.includes('javascript:') && !/href=["']javascript:/i.test(rendered.stdout) : true
    const shapeValid = feature === 'HTML attributes' ? positive.stdout.includes('{#matrix}') :
      feature === 'BBCode URL attribute' ? positive.stdout.includes('(https://example.test)') :
      feature.includes('empty mark') ? positive.stdout.trim() === token :
      feature.includes('table') ? positive.stdout.includes('|') :
      feature.includes('nested') ? /^>\s*>/m.test(positive.stdout) : true
    return [positive, negative, rendered, empty].every(x => x.status === 0) &&
      rendered.stdout.includes(token) && !empty.stdout.includes(token) && deniedUrlSafe && shapeValid ? 'yes' : 'partial'
  })
  lines.push(`| ${feature} | ${cells.join(' | ')} |`)
}
lines.push('')
lines.push('## Public path inventory', '',
  '| Path or option | JavaScript | PHP | Rust |', '|---|---|---|---|',
  '| CLI import: HTML, Markdown, Djot, BBCode | yes | yes | yes |',
  '| CLI input: Carve, AST JSON | yes | yes | yes |',
  '| CLI output: HTML, Markdown, plain, ANSI, Carve, AST JSON | yes | yes | yes |',
  '| HTML import modes: safe, semantic, roundtrip | yes | yes | yes |',
  '| Import fidelity report and loss gate | yes | yes | partial ([source path](https://github.com/markup-carve/carve-rs/issues/2737)) |',
  '| Render loss report, strict gate and roundtrip export | partial | partial | partial |',
  '| Canonical formatter | yes | yes | partial at pin ([fixed after pin](https://github.com/markup-carve/carve-rs/pull/2739)) |',
  '| Library AST ingest and serialization | partial | partial | partial |',
  '| Library callbacks and streaming render | partial | partial | partial |',
  '| WASM entry point | no (none advertised) | no (none advertised) | no (none advertised) |', '',
  'A `partial` inventory cell means an entry point is exposed but these probes cover only part of its contract. The CLI grid above checks every source and target pair; focused checks cover the listed behaviors.', '',
  '## Construct gaps at the audited commits', '',
  '| Control | JavaScript | PHP | Rust |', '|---|---|---|---|',
  '| 128 Markdown native destinations | 128/128 | 67/128, [fixed after pin](https://github.com/markup-carve/carve-php/pull/3399) | [78/128](https://github.com/markup-carve/carve-rs/issues/2735) |',
  '| Canonical formatter fixtures | passed | passed | 4 table cases differ, [fixed after pin](https://github.com/markup-carve/carve-rs/pull/2739) |',
  '| Markdown literal report location | passed | passed | [missing `line:1`](https://github.com/markup-carve/carve-rs/issues/2737) |', '')
lines.push('## Focused checks at these commits', '',
  '- The import report comparison passed 82 cases across the three engines, including HTML modes and reported loss rows.',
  '- Seven degradation claims passed across the engines for interactive content, captions and math.',
  '- AST ingest compared 2,618 documents across the engines with no observed difference.',
  '- The canonical formatter check passed 88 of 92 fixtures across all three pinned engines. The four Rust table disagreements were [fixed after the pin](https://github.com/markup-carve/carve-rs/pull/2739).',
  '- Focused streaming, source position and AST depth suites passed: JavaScript 25 tests, PHP 33 tests and Rust streaming 7 tests.',
  '- The AST and formatter controls above cover one position pair, a malformed root, excess depth and a malformed link.',
  '- Library callbacks and WASM host behavior remain outside the CLI grid. Streaming is covered by the focused suites.', '')
if (process.argv.includes('--write')) writeFileSync(resolve(root, 'docs/supported-path-matrix.md'), lines.join('\n'))
else process.stdout.write(lines.join('\n'))
