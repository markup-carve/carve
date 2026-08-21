/*
 * A first-party git dependency names one commit, and it is the commit that gets
 * installed.
 *
 * `package.json` names the `@markup-carve/carve` commit this repo measures
 * against, and every human-readable claim about "the pinned build" reads that
 * field. What actually gets installed is the LOCKFILE's resolution, because CI
 * runs `npm ci`. When the two disagree, `npm run engine:report` is describing a
 * build the repo does not declare, and `resources/engine-pin-drift.txt` records
 * drift against that other build - so both the report and the drift file can be
 * green while the stated pin is fiction.
 *
 * They can disagree by accident: `npm run bump-carve-pin` writes package.json
 * and then PRINTS "Now run: npm install". Skip that line - or land the bump
 * without committing the regenerated lock - and the two part company silently.
 * Found 16 commits apart (carve#661).
 *
 * There is a second way to have no pin at all, and it went unnoticed for longer
 * because it does not look like a mismatch. A git dependency written with NO
 * ref means "whatever tip is at install time", so the manifest and the lock
 * disagree about what the dependency even is: a fresh install takes tip, an
 * `npm ci` takes whatever the lock happened to capture. carve#1476 found
 * carve-grammars that way, resolved to a build 201 commits behind its own main,
 * and vite-plugin-carve alongside it - which the survey that filed the issue had
 * missed, because it was spelled `git+https://` rather than `github:`.
 *
 * So this checks the dependency for what it IS - a git URL pointing into this
 * org - rather than for how it happens to be spelled, and it checks EVERY one
 * rather than the reference build alone. A check that only knew the two
 * spellings in front of it would be exactly as blind as the survey was.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(readFileSync(resolve(repo, 'package.json'), 'utf8'))
const lock = JSON.parse(readFileSync(resolve(repo, 'package-lock.json'), 'utf8'))

const SHA = /[0-9a-f]{40}/
const ORG = 'markup-carve'

/*
 * Anything that names a repository in this org, however it is spelled.
 *
 * Deliberately not a list of the spellings currently in use. npm accepts
 * `github:owner/repo`, a bare `owner/repo` shorthand, `git@github.com:owner/repo.git`
 * and five `git+<protocol>://` forms, and this repo already uses two of them.
 * A matcher keyed on the prefix would have to grow a case per spelling, and a
 * dependency added in a spelling nobody thought of would pass the check by not
 * being seen - the failure this whole test exists to stop.
 *
 * So the org name is the signal. The exclusions are the specs that legitimately
 * name no commit: `npm:` is a registry alias, and `file:`/`link:`/`workspace:`
 * are local paths.
 */
const NAMES_THIS_ORG = new RegExp(String.raw`(^|[^@\w.-])${ORG}/`)
const isFirstPartyGit = (spec) => !/^(npm|file|link|workspace):/.test(spec) && NAMES_THIS_ORG.test(spec)

const firstPartyGitDependencies = Object.entries({
  ...(pkg.dependencies ?? {}),
  ...(pkg.devDependencies ?? {}),
}).filter(([, spec]) => isFirstPartyGit(spec))

test('every first-party git dependency names a commit, and the lock installs that commit', () => {
  // The scan IS the check, so a scan that matched nothing would pass for the
  // wrong reason - which is how the survey behind carve#1476 concluded there
  // was one unpinned dependency when there were two.
  assert.ok(
    firstPartyGitDependencies.length >= 3,
    `expected the first-party git dependencies to be found, matched ${firstPartyGitDependencies.length}`,
  )

  for (const [name, spec] of firstPartyGitDependencies) {
    const declaredSha = spec.match(SHA)?.[0]
    assert.ok(
      declaredSha,
      `${name} is a git dependency with no commit: ${spec}\n` +
        'That means "whatever tip is at install time", so a fresh install and an ' +
        '`npm ci` can get different code. Pin it at a merged commit on the ' +
        "dependency's main and commit the regenerated lockfile with it.",
    )

    const entry = lock.packages?.[`node_modules/${name}`]
    assert.ok(entry, `no ${name} entry in package-lock.json`)
    const lockedSha = String(entry.resolved ?? '').match(SHA)?.[0]
    assert.ok(lockedSha, `lockfile resolution for ${name} has no commit: ${entry.resolved}`)

    assert.equal(
      lockedSha,
      declaredSha,
      `package.json and package-lock.json name DIFFERENT ${name} commits. ` +
        'CI installs the lockfile one, so every claim made about the declared ' +
        'commit describes some other build. Run `npm install` after moving the ' +
        'pin and commit the lockfile with it.',
    )
  }
})

test('the reference build is one of them', () => {
  // Named on its own because it is the pin the report, the drift ledger and the
  // corpus all measure against: losing it entirely would leave the loop above
  // with nothing to say.
  const declared = pkg.devDependencies?.['@markup-carve/carve'] ?? pkg.dependencies?.['@markup-carve/carve']
  assert.ok(declared, 'no @markup-carve/carve dependency in package.json')
  assert.ok(isFirstPartyGit(declared), `the reference build is not a first-party git pin: ${declared}`)
})

/*
 * The matcher's own coverage, because "it matches on the org rather than the
 * spelling" is a claim about a regular expression and claims about regular
 * expressions are worth checking. Both columns matter: a matcher that returned
 * true for everything would pass the first list and fail the second.
 */
test('every spelling npm accepts for a repository in this org is recognized', () => {
  for (const spec of [
    'github:markup-carve/x',
    'git+https://github.com/markup-carve/x.git',
    'git+ssh://git@github.com/markup-carve/x.git',
    'git+ssh://git@github.com:markup-carve/x.git',
    'git://github.com/markup-carve/x.git',
    'git@github.com:markup-carve/x.git',
    'https://github.com/markup-carve/x/archive/refs/heads/main.tar.gz',
    'markup-carve/x',
    'markup-carve/x#semver:^1',
  ]) {
    assert.ok(isFirstPartyGit(spec), `not recognized as a first-party git dependency: ${spec}`)
  }

  for (const spec of ['^0.1.4', '~2.0.0', 'npm:@markup-carve/carve@^0.1.4', 'file:../markup-carve/x', 'github:other-org/x']) {
    assert.ok(!isFirstPartyGit(spec), `wrongly treated as a first-party git dependency: ${spec}`)
  }
})
