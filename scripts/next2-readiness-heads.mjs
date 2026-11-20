import { spawnSync } from 'node:child_process'

export function verifyPreparedHeads(dirs, heads, baselineHeads) {
  for (const engine of ['js', 'php', 'rs']) {
    const found = heads[engine]
    const baseline = baselineHeads?.[engine]
    const error = reason => new Error(`Cannot verify prepared ${engine} checkout: found ${found}, baseline ${baseline ?? '(missing)'}; ${reason}. Check out next2, or run without --prepared.`)
    if (!baseline) throw error('the baseline has no recorded engine commit')
    const result = spawnSync('git', ['-C', dirs[engine], 'merge-base', '--is-ancestor', baseline, found], { encoding: 'utf8', timeout: 30_000 })
    if (result.status === 0) continue
    if (result.status === 1) throw error('the checkout does not contain the baseline commit')
    throw error(`Git could not verify ancestry${result.stderr?.trim() ? `: ${result.stderr.trim()}` : ''}`)
  }
}
