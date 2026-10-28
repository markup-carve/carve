#!/usr/bin/env node
/*
 * Compare PART 12 trees after Carve -> roundtrip HTML/Markdown -> Carve.
 * Match the PHP measurement: remove positions, srcByteLength, bulletChar,
 * marker, delim, ref, rawRef, separatorWidths, tight, boldItalic and order;
 * drop empty/order-only attrs and comments; autolink becomes link and
 * escaped_text becomes text. Soft breaks become spaces, adjacent text merges,
 * and Unicode whitespace collapses in every string, including code and URLs.
 * Keep the first difference per document and at most three examples per bucket.
 * A strict count keeps the PART 10 §13 carrier fields among the identical trees.
 * --check gates identical and strict counts against resources/roundtrip-structure-baseline.json.
 * Inspect improvements, then --write with all pinned engines to raise the baseline.
 * Missing engines are skipped; --check and --write fail if a selected engine is missing.
 * The JS pin 52bb3c2e parses corpus 638's outer list as loose. Its roundtrip
 * HTML contains only a nested list, so HTML import cannot recover that unused
 * tightness bit. This accounts for the strict baseline moving 2290 to 2289.
 * The JS 52aedcc8 pin keeps corpus 643's column-zero list outside its
 * footnote. Markdown roundtrip escapes the footnote's literal `+`, leaving
 * the normalized tree equal but changing text to escaped_text in the strict
 * carrier comparison. This moves JS/md strict from 1689 to 1688.
 * The RS 4d0df469 pin reads corpus 652-2's quoted `+` as text (carve-rs#3106),
 * which Markdown roundtrip escapes the same way. RS/md strict 2015 to 2014.
 * At JS d2709c00 (carve-js#3502, recorded in carve#3489), corpus 626,
 * 626-2, 626-3 and 630-9 write a literal `+` that Markdown must escape.
 * Import keeps escaped_text, moving JS/md strict 1724 to 1720.
 * At Rust 7db0926a (carve-rs#3115, carve#3550), corpus 658 remains semantically equal
 * after HTML import, but text becomes escaped_text in the strict tree.
 * This moves RS/html strict 2349 to 2348.
 * At PHP a562b167 (carve-php#3855), Markdown export escapes the literal
 * description line in corpus 657 and 657-4. Reimport keeps escaped_text
 * instead of text, moving PHP/md strict from 1656 to 1654.
 * At JS d8cf5cc1, corpus 739-7, 739-8 and 741-2 parse as their expected HTML
 * says (a quote holding U+2029 or U+2028, an unresolved footnote-heading
 * reference). Markdown import drops the separator-only paragraph and reads the
 * escaped reference as text. With 352 and 352-3 gained, JS/md identical
 * moves 2472 to 2471.
 */
import { readFileSync, readdirSync, existsSync, writeFileSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { resolve, basename } from 'node:path'
import { phpDir, rustBinary } from './lib/engine-locations.mjs'
import { acceptHtmlLosses, normalize, firstDiff, record, validateBaseline, checkCounts, jsRoundtrip, finishMeasurement, baselineCounts } from './lib/roundtrip-structure.mjs'
const root = fileURLToPath(new URL('..', import.meta.url))
const baselinePath = resolve(root, 'resources/roundtrip-structure-baseline.json')
function options(args) {
  const result = { engines: ['js', 'php', 'rs'], targets: ['html', 'md'], workers: 16 }
  for (let i = 0; i < args.length; i++) {
    const [flag, inline] = args[i].split('=')
    if (['--json', '--check', '--write'].includes(flag) && inline === undefined) result[flag.slice(2)] = true
    else if (flag === '--workers') {
      const value = inline ?? args[++i]
      if (!/^[1-9][0-9]*$/.test(value ?? '') || Number(value) > 64) throw new Error('Invalid --workers (1..64)')
      result.workers = Number(value)
    } else if (['--engine', '--target'].includes(flag)) {
      const values = (inline ?? args[++i] ?? '').split(',')
      const allowed = flag === '--engine' ? ['js', 'php', 'rs'] : ['html', 'md']
      if (values.some(v => !allowed.includes(v))) throw new Error(`Invalid ${flag}`)
      result[flag === '--engine' ? 'engines' : 'targets'] = [...new Set(values)]
    } else throw new Error(`Unknown option ${args[i]}`)
  }
  if (result.check && result.write) throw new Error('Choose --check or --write')
  if (result.write && (result.engines.length !== 3 || result.targets.length !== 2)) throw new Error('--write requires all engines and targets')
  return result
}
function run(command, args, input) {
  return new Promise((accept, reject) => {
    const child = spawn(command, args, { cwd: root, stdio: ['pipe', 'pipe', 'pipe'] })
    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    let out = '', err = ''
    const timer = setTimeout(() => { child.kill(); reject(new Error(`${command}: timeout`)) }, 30000)
    child.stdout.on('data', data => { out += data })
    child.stderr.on('data', data => { err = (err + data).slice(-4000) })
    child.on('error', reject)
    child.stdin.on('error', error => { if (error.code !== 'EPIPE') reject(error) })
    child.on('close', code => { clearTimeout(timer); code === 0 ? accept(out) : reject(new Error(`${command}: exit ${code}: ${err}`)) })
    child.stdin.end(input)
  })
}
async function streamRows(command, args, request, consume) {
  const child = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'] })
  child.stdout.setEncoding('utf8')
  child.stderr.setEncoding('utf8')
  let stderr = ''
  child.stderr.on('data', data => { stderr = (stderr + data).slice(-4000) })
  const done = new Promise((accept, reject) => {
    child.on('error', reject)
    child.on('close', code => code === 0 ? accept() : reject(new Error(`${command} driver exit ${code}: ${stderr}`)))
  })
  done.catch(() => {})
  child.stdin.on('error', error => { if (error.code !== 'EPIPE') child.kill() })
  child.stdin.end(JSON.stringify(request))
  try {
    const readRow = line => {
      let row
      try { row = JSON.parse(line) } catch (error) { throw new Error(`${command} driver emitted invalid JSON: ${error.message}; row starts ${line.slice(0, 160)}`) }
      consume(row)
    }
    let pending = ''
    for await (const chunk of child.stdout) {
      pending += chunk
      let end
      while ((end = pending.indexOf('\n')) !== -1) {
        readRow(pending.slice(0, end))
        pending = pending.slice(end + 1)
      }
    }
    await done
    if (pending) readRow(pending)
  } catch (error) { child.kill(); await done.catch(() => {}); throw error }
}
async function main() {
  const opt = options(process.argv.slice(2)), started = performance.now()
  const files = readdirSync(resolve(root, 'tests/corpus')).filter(f => f.endsWith('.crv')).sort().map(f => resolve(root, 'tests/corpus', f))
  const report = { total: files.length, results: [], notices: [] }
  for (const engine of opt.engines) {
    let js, binary, unavailable
    const driver = engine === 'rs' ? process.env.CARVE_RS_ROUNDTRIP_DRIVER : undefined
    if (engine === 'js') {
      try { js = await import('@markup-carve/carve') } catch (error) { unavailable = error.message }
    } else if (engine === 'php') {
      if (!existsSync(resolve(phpDir(), 'vendor/autoload.php'))) unavailable = 'PHP checkout or Composer dependencies missing'
      else try { await run('php', ['--version'], '') } catch (error) { unavailable = error.message }
    } else {
      binary = driver ?? process.env.CARVE_RS_ROUNDTRIP_BINARY ?? rustBinary()
      if (!binary || !existsSync(binary)) unavailable = 'Rust binary missing'
      else try { await run(binary, driver ? [] : ['--version'], driver ? JSON.stringify({ files: [], targets: [] }) : '') } catch (error) { unavailable = error.message }
    }
    const rows = Object.fromEntries(opt.targets.map(target => [target, { engine, target, status: unavailable ? 'skipped' : 'measured', ...(unavailable ? { reason: unavailable } : {}), total: 0, identical: 0, strict: 0, different: 0, errors: 0, buckets: {}, errorBuckets: {}, strictBuckets: {} }]))
    const tick = performance.now()
    const consume = row => {
      const before = row.target === 'html' ? acceptHtmlLosses(row.before) : row.before
      const after = row.target === 'html' ? acceptHtmlLosses(row.after) : row.after
      const diff = row.error ? null : firstDiff(normalize(before), normalize(after))
      const strictDiff = row.error || diff ? null : firstDiff(normalize(before, true), normalize(after, true))
      record(rows[row.target], row.file, diff, row.error, row.message, strictDiff)
    }
    if (!unavailable && engine === 'php') {
      await streamRows('php', [resolve(root, 'scripts/roundtrip-structure.php'), phpDir()], { files, targets: opt.targets }, consume)
    } else if (!unavailable && driver) {
      const groups = Array.from({ length: Math.min(opt.workers, files.length) }, () => [])
      files.forEach((file, i) => groups[i % groups.length].push(file))
      await Promise.all(groups.map(files => streamRows(driver, [], { files, targets: opt.targets }, consume)))
    } else if (!unavailable) {
      let cursor = 0
      await Promise.all(Array.from({ length: engine === 'rs' ? opt.workers : 1 }, async () => {
        while (cursor < files.length) {
          const file = files[cursor++]
          const source = readFileSync(file, 'utf8')
          let before, parseError
          try { before = engine === 'js' ? js.carveToAstJson(source) : JSON.parse(await run(binary, ['--json'], source)) } catch (error) { parseError = error }
          for (const target of opt.targets) {
            try {
              if (parseError) throw parseError
              let after
              if (engine === 'js') {
                after = jsRoundtrip(js, source, target)
              } else {
                const mid = await run(binary, [target === 'html' ? '--html' : '--markdown', '--roundtrip'], source)
                const back = await run(binary, ['migrate', '--from', target === 'html' ? 'html' : 'markdown'], mid)
                after = JSON.parse(await run(binary, ['--json'], back))
              }
              consume({ file: basename(file), target, before, after })
            } catch (error) { consume({ file: basename(file), target, error: error.name, message: error.message }) }
          }
        }
      }))
    }
    for (const row of Object.values(rows)) {
      if (!unavailable && row.total !== files.length) throw new Error(`${engine}/${row.target}: incomplete corpus`)
      finishMeasurement(row)
      if (engine === 'rs') { row.workers = opt.workers; row.transport = driver ? 'batch' : 'cli' }
      row.seconds = +((performance.now() - tick) / 1000).toFixed(3)
      report.results.push(row)
    }
  }
  let failed = false
  if (opt.write) for (const row of report.results) if (row.status === 'skipped') {
    failed = true
    report.notices.push(`${row.engine}/${row.target}: skipped, cannot write baseline`)
  }
  if (opt.check) {
    const baseline = validateBaseline(JSON.parse(readFileSync(baselinePath, 'utf8')))
    const verdict = checkCounts(report.results, baseline)
    failed = verdict.failed
    report.notices.push(...verdict.notices)
  }
  if (opt.write && !failed) {
    writeFileSync(baselinePath, JSON.stringify(baselineCounts(report.results), null, 2) + '\n')
  }
  report.seconds = +((performance.now() - started) / 1000).toFixed(3)
  if (opt.json) console.log(JSON.stringify(report, null, 2))
  else {
    console.log('Engine  Target  Identical / total  Strict  Different  Errors  Status')
    for (const row of report.results) {
      console.log(`${row.engine.padEnd(8)}${row.target.padEnd(8)}${`${row.identical} / ${row.total}`.padEnd(19)}${String(row.strict).padEnd(8)}${String(row.different).padEnd(11)}${String(row.errors).padEnd(8)}${row.status}${row.reason ? ': ' + row.reason : ''}`)
      for (const [kind, bucket] of Object.entries(row.errorBuckets)) console.log(`  ${bucket.count} ERROR ${kind}: ${bucket.examples.map(e => `${e.file}: ${e.message ?? kind}`).join(', ')}`)
      for (const [kind, bucket] of Object.entries(row.buckets).slice(0, 10)) console.log(`  ${bucket.count} ${kind}: ${bucket.examples.map(e => e.file).join(', ')}`)
      for (const [kind, bucket] of Object.entries(row.strictBuckets).slice(0, 5)) console.log(`  ${bucket.count} STRICT ${kind}: ${bucket.examples.map(e => e.file).join(', ')}`)
    }
    for (const notice of report.notices) console.log(notice)
    console.log(`Runtime: ${report.seconds}s`)
  }
  if (failed) process.exitCode = 1
}
main().catch(error => { console.error(error.message); process.exitCode = 2 })
