/*
 * A FLEET OF ENGINE CHECKOUTS, BUILT FROM NOTHING.
 *
 * A submodule pin is an index entry and nothing more, so `git update-index
 * --cacheinfo` can stand up any fleet state a test needs - including ones that
 * never existed - with no network, no clone and no commit.
 *
 * Two callers, for two different reasons. tests/the-fleet-pin-check-fires.test.mjs
 * builds diverging fleets because divergence is its subject. The pre-tag tests in
 * tests/test-manifest.test.mjs build an AGREEING one because it is not: they ask
 * whether a tag name parses, and without a fleet of their own they would inherit
 * the real one and go red whenever three other repositories happen to disagree.
 */

import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const git = (dir, args) => execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8' }).trim()

/** The submodule path each engine really uses; carve-js is the odd one out. */
export const SUBMODULE_PATH = {
  'carve-js': 'spec',
  'carve-rs': 'tests/spec',
  'carve-php': 'tests/spec',
}

/**
 * Spec commits a synthetic pin may use, resolved the same way the check resolves
 * the ref it measures against.
 *
 * NOT `HEAD`. On pull-request CI the checkout is the PR head or a merge commit,
 * which is not an ancestor of `origin/main`, so every synthetic pin would be
 * rejected as unreachable before a single agreement assertion ran - the tests
 * would go red for a reason that has nothing to do with what they test.
 */
export function specCommit(repo, back = 0) {
  const rev = (r) => git(repo, ['rev-parse', `${r}^{commit}`])
  for (const candidate of ['origin/main', 'main', 'HEAD']) {
    try {
      const base = rev(candidate)
      return back === 0 ? base : rev(`${base}~${back}`)
    } catch {
      /* try the next one */
    }
  }
  throw new Error(`cannot resolve a spec commit in ${repo}`)
}

export function makeEngine(root, name, pin, submodulePath = SUBMODULE_PATH[name]) {
  const dir = join(root, name)
  mkdirSync(dir, { recursive: true })
  git(dir, ['init', '--quiet', '-b', 'main'])
  // Repo-local, on a directory that is deleted at the end of the test. The
  // identity never reaches a real checkout.
  git(dir, ['config', 'user.email', 'fleet@example.invalid'])
  git(dir, ['config', 'user.name', 'synthetic fleet'])
  writeFileSync(
    join(dir, '.gitmodules'),
    `[submodule "${submodulePath}"]\n\tpath = ${submodulePath}\n\turl = https://github.com/markup-carve/carve.git\n`,
  )
  git(dir, ['add', '.gitmodules'])
  git(dir, ['update-index', '--add', '--cacheinfo', `160000,${pin},${submodulePath}`])
  git(dir, ['commit', '--quiet', '-m', 'pin the spec'])
  // The check reads each engine at `origin/main` by default, AND fails when it
  // cannot fetch that ref. So the synthetic engine gets a real local origin to
  // fetch from, which keeps the tests hermetic instead of reaching the network.
  const origin = `${dir}.git`
  git(dir, ['init', '--quiet', '--bare', origin])
  git(dir, ['remote', 'add', 'origin', origin])
  git(dir, ['push', '--quiet', 'origin', 'main'])
  return dir
}

/**
 * The CARVE_*_DIR overrides for a fleet pinned as `pins` says. An engine left
 * out of `pins` gets a path that does not exist, which is how a missing checkout
 * is exercised.
 */
export function fleetEnv(root, pins) {
  const env = {}
  for (const name of Object.keys(SUBMODULE_PATH)) {
    const key = `${name.replace('-', '_').toUpperCase()}_DIR`
    env[key] = pins[name] === undefined ? join(root, `absent-${name}`) : makeEngine(root, name, pins[name])
  }
  return env
}
