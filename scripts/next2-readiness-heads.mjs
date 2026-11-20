import { spawnSync } from 'node:child_process'

export function verifyPreparedHeads(dirs, heads, baselineHeads) {
  for (const engine of ['js', 'php', 'rs']) {
    const found = heads[engine]
    const baseline = baselineHeads?.[engine]
    const error = reason => new Error(`Cannot verify prepared ${engine} checkout: found ${found}, baseline ${baseline ?? '(missing)'}; ${reason}. Check out next2, or run without --prepared.`)
    if (!baseline) throw error('the baseline has no recorded engine commit')
    const git = (args, timeout = 30_000) => spawnSync('git', ['-C', dirs[engine], ...args], { encoding: 'utf8', timeout })
    let result = git(['merge-base', '--is-ancestor', baseline, found])
    if (result.status !== 0) {
      const shallow = git(['rev-parse', '--is-shallow-repository'])
      if (shallow.status === 0 && shallow.stdout.trim() === 'true') {
        const fetched = git(['fetch', '--unshallow', 'origin'], 12 * 60_000)
        if (fetched.status !== 0) throw error(`Git could not deepen shallow history${fetched.stderr?.trim() ? `: ${fetched.stderr.trim()}` : ''}`)
        result = git(['merge-base', '--is-ancestor', baseline, found])
      }
    }
    if (result.status === 0) continue
    if (result.status === 1) throw error('the checkout does not contain the baseline commit')
    throw error(`Git could not verify ancestry${result.stderr?.trim() ? `: ${result.stderr.trim()}` : ''}`)
  }
}
