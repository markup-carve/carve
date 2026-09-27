import { execFileSync } from 'node:child_process'
import { readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'

export function qualityAdapter(directory, execute = execFileSync) {
  return (engine, action, source, mode) => {
    const argv = engine.commands[action]
    if (!Array.isArray(argv) || !argv.length || !argv.every((arg) => typeof arg === 'string')) {
      throw new Error(`Missing argv for ${engine.name}/${action}`)
    }
    const report = join(directory, 'import.json')
    if (action === 'import') rmSync(report, {force: true})
    const expanded = argv.map((arg) => arg.replace(/\{(mode|report)\}/g, (_, key) => ({mode, report})[key] ?? ''))
    const output = execute(expanded[0], expanded.slice(1), {cwd: engine.cwd, input: source, encoding: 'utf8', timeout: 30000, maxBuffer: 16 * 1024 * 1024})
    return action === 'import' ? {source: output, report: JSON.parse(readFileSync(report, 'utf8'))} : output
  }
}
