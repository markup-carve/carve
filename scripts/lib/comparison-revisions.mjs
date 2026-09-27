import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

function git(directory, args) {
  if (!existsSync(join(directory, '.git'))) return { status: null, stdout: '' }
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')))
  return spawnSync('git', ['-C', directory, ...args], {
    env, encoding: 'utf8', timeout: 5000, maxBuffer: 1024 * 1024,
  })
}

function checkout(directory) {
  const revision = git(directory, ['rev-parse', '--verify', 'HEAD'])
  const head = revision.status === 0 ? revision.stdout.trim() : null
  const diff = head === null ? null : git(directory, ['diff', '--quiet', 'HEAD', '--ignore-submodules=untracked'])
  return { head, trackedChanges: diff?.status === 0 ? false : diff?.status === 1 ? true : null }
}

/** Checkout identities, not proof that an engine binary was built from them. */
export function comparisonRevisions(root, engines) {
  return {
    corpus: checkout(root),
    engines: Object.fromEntries(engines.map(({ name, cwd }) => {
      const specPath = name === 'js' ? 'spec' : 'tests/spec'
      const entry = git(cwd, ['ls-tree', 'HEAD', '--', specPath])
      const recorded = /^160000 commit ([a-f0-9]+)\t/.exec(entry.status === 0 ? entry.stdout : '')?.[1] ?? null
      const specDirectory = join(cwd, specPath)
      // An uninitialized submodule directory makes git resolve its parent's HEAD.
      const actual = existsSync(join(specDirectory, '.git'))
        ? checkout(specDirectory) : { head: null, trackedChanges: null }
      return [name, { ...checkout(cwd), spec: { recorded, ...actual } }]
    })),
  }
}

export function printComparisonRevisions(revisions) {
  const identity = value => `head=${value.head ?? 'unknown'} tracked_changes=${value.trackedChanges ?? 'unknown'}`
  console.log(`revision corpus ${identity(revisions.corpus)}`)
  for (const [name, engine] of Object.entries(revisions.engines)) {
    console.log(`revision ${name} ${identity(engine)} spec_pin=${engine.spec.recorded ?? 'unknown'} spec_head=${engine.spec.head ?? 'unknown'} spec_tracked_changes=${engine.spec.trackedChanges ?? 'unknown'}`)
  }
}
