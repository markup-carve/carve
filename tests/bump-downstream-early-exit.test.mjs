/*
 * The bump workflow's early exit, executed rather than read.
 *
 * `bump-downstream.yml` skips a repo whose spec submodule already pins the
 * target commit. That skip is correct and deliberate. What it used to do on
 * the way out was `exit 0` and nothing else - so a bump PR an EARLIER run of
 * the same workflow had opened stayed open forever, because every later run
 * took the same path and said "nothing to do" again.
 *
 * That is the defect carve#850 demonstrates: markup-carve/carve-rs#724 was a
 * hand-written fix that carried the same submodule bump, and merged; the bot's
 * own draft markup-carve/carve-rs#723 then had to be closed by hand. It is not
 * only clutter. Once main moves the submodule forward, the orphan branch
 * carries an OLDER sha, so merging it reverts the pin.
 *
 * A workflow is only ever exercised by pushing to main, which is exactly why
 * this path went unnoticed. So the step's script is extracted from the YAML and
 * RUN here - verbatim, no rewriting - against local git fixtures and a stub
 * `gh` on PATH. The fixtures reproduce the carve-rs shape: main already pins
 * the target commit, and an `automation/bump-spec` PR is open.
 *
 * Two scenarios, because the fix has to be conditional:
 *
 *   orphan  - the branch carries only this workflow's own commits. The PR is a
 *             no-op and must be CLOSED.
 *   human   - the branch carries a commit somebody else wrote. Nothing to bump,
 *             but the PR is not the workflow's to close and must be LEFT OPEN.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, chmodSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve, dirname, join, isAbsolute } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const repo = resolve(here, '..')
const workflow = resolve(repo, '.github/workflows/bump-downstream.yml')

const BOT_EMAIL = '41898282+github-actions[bot]@users.noreply.github.com'

/**
 * Pull the `run:` block scalar out of the "Bump" step. The block is taken
 * verbatim and only dedented - substituting anything would mean testing a
 * different script than the one that ships.
 */
function extractBumpScript() {
  const lines = readFileSync(workflow, 'utf8').split('\n')
  const stepAt = lines.findIndex((line) => /^\s+- name: Bump /.test(line))
  assert.notEqual(stepAt, -1, 'the workflow no longer has a step whose name starts with "Bump "')

  const runAt = lines.findIndex((line, i) => i > stepAt && /^\s+run: \|\s*$/.test(line))
  assert.notEqual(runAt, -1, 'the Bump step no longer carries a `run: |` block')

  const indent = lines[runAt].match(/^\s*/)[0].length + 2
  const body = []
  for (let i = runAt + 1; i < lines.length; i += 1) {
    const line = lines[i]
    if (line.trim() === '') {
      body.push('')
      continue
    }
    if (line.match(/^\s*/)[0].length < indent) break
    body.push(line.slice(indent))
  }
  return body.join('\n')
}

function git(cwd, ...args) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: 'fixture',
      GIT_AUTHOR_EMAIL: BOT_EMAIL,
      GIT_COMMITTER_NAME: 'fixture',
      GIT_COMMITTER_EMAIL: BOT_EMAIL,
      GIT_CONFIG_COUNT: '1',
      GIT_CONFIG_KEY_0: 'protocol.file.allow',
      GIT_CONFIG_VALUE_0: 'always',
    },
  })
}

/**
 * carve-remote: two commits on main, OLD then NEW. NEW is what the workflow
 * resolves and tries to bump every downstream repo to.
 */
function buildCarveRemote(root) {
  const work = join(root, 'carve-work')
  mkdirSync(work, { recursive: true })
  git(work, 'init', '-q', '-b', 'main')
  writeFileSync(join(work, 'corpus.txt'), 'old\n')
  git(work, 'add', '-A')
  git(work, 'commit', '-q', '-m', 'old corpus')
  const OLD = git(work, 'rev-parse', 'HEAD').trim()
  writeFileSync(join(work, 'corpus.txt'), 'new\n')
  git(work, 'add', '-A')
  git(work, 'commit', '-q', '-m', 'new corpus')
  const NEW = git(work, 'rev-parse', 'HEAD').trim()

  const bare = join(root, 'carve.git')
  git(root, 'clone', '-q', '--bare', work, bare)
  return { bare, OLD, NEW }
}

/**
 * downstream: main already pins NEW (the bump arrived by another route), and an
 * `automation/bump-spec` branch is still around pinning OLD.
 *
 * `humanCommit` decides who wrote the extra commit on that branch.
 */
function buildDownstream(root, carve, { humanCommit, branchAfterBump = false, botExtraFile = false }) {
  const work = join(root, 'down-work')
  mkdirSync(work, { recursive: true })
  git(work, 'init', '-q', '-b', 'main')
  writeFileSync(join(work, 'README.md'), 'downstream\n')
  git(work, 'add', '-A')
  git(work, 'commit', '-q', '-m', 'init')
  git(work, '-c', 'protocol.file.allow=always', 'submodule', 'add', '-q', `file://${carve.bare}`, 'spec')
  git(work, '-C', 'spec', 'checkout', '-q', carve.OLD)
  git(work, 'add', '-A')
  git(work, 'commit', '-q', '-m', 'pin spec at OLD')

  // `branchAfterBump` decides whether merging main into the branch produces a
  // commit. Cut from the OLD main it does; cut from a main that already carries
  // the pin the merge is a no-op, and the two land on DIFFERENT exits.
  if (branchAfterBump) {
    git(work, '-C', 'spec', 'checkout', '-q', carve.NEW)
    git(work, 'add', '-A')
    git(work, 'commit', '-q', '-m', 'fix: carried the spec bump by hand')
  }

  git(work, 'checkout', '-q', '-b', 'automation/bump-spec')
  if (humanCommit) {
    // What the draft body asks a human for: an allowlist entry.
    writeFileSync(join(work, 'allowlist.txt'), 'a human added a category\n')
  } else {
    // What this workflow writes on its own: the gitlink, and nothing else -
    // markup-carve/carve-rs#723's exact shape.
    git(work, '-C', 'spec', 'checkout', '-q', carve.NEW)
    if (botExtraFile) {
      // ...unless CODEX_API_KEY was set, in which case the codex attempt is
      // committed under the same identity and the branch is not a no-op.
      writeFileSync(join(work, 'src-impl.txt'), 'codex implemented the category\n')
    }
  }
  git(work, 'add', '-A')
  const authorEnv = humanCommit
    ? ['-c', 'user.name=A Human', '-c', 'user.email=human@example.com']
    : []
  execFileSync('git', [...authorEnv, 'commit', '-q', '-m', 'chore: bump'], {
    cwd: work,
    encoding: 'utf8',
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: humanCommit ? 'A Human' : 'fixture',
      GIT_AUTHOR_EMAIL: humanCommit ? 'human@example.com' : BOT_EMAIL,
      GIT_COMMITTER_NAME: humanCommit ? 'A Human' : 'fixture',
      GIT_COMMITTER_EMAIL: humanCommit ? 'human@example.com' : BOT_EMAIL,
    },
  })

  git(work, 'checkout', '-q', 'main')
  git(work, '-C', 'spec', 'checkout', '-q', carve.NEW)
  if (!branchAfterBump) {
    // main then moves forward on its own and lands the same pin.
    git(work, 'add', '-A')
    git(work, 'commit', '-q', '-m', 'fix: carried the spec bump by hand')
  }

  const bare = join(root, 'downstream.git')
  git(root, 'clone', '-q', '--bare', work, bare)
  git(bare, 'symbolic-ref', 'HEAD', 'refs/heads/main')
  return bare
}

/** A `gh` that answers only what this path asks, and logs every call. */
function writeGhStub(dir, { downstreamBare, log, prState }) {
  mkdirSync(dir, { recursive: true })
  const stub = join(dir, 'gh')
  writeFileSync(
    stub,
    `#!/usr/bin/env bash
set -uo pipefail
printf '%s\\n' "$*" >> ${JSON.stringify(log)}
case "$1 $2" in
  "auth setup-git") exit 0 ;;
  "repo clone")
    # gh repo clone <REPO> <dir> -- <git args...>
    git clone -q --depth 1 "file://${downstreamBare}" "$4"
    exit $?
    ;;
  *) ;;
esac
if [ "$1" = "api" ]; then
  case "$2" in
    */compare/*)
      case "$*" in
        # ".files[].filename" -> what the branch changes. Computed by real git
        # against the fixture, three-dot like the API's own compare.
        *files*)
          git --git-dir=${JSON.stringify(downstreamBare)} diff --name-only main...automation/bump-spec
          ;;
        # ".commits[]" -> who wrote the commits ahead of main.
        *)
          cat ${JSON.stringify(join(dir, 'compare.txt'))}
          ;;
      esac
      exit 0
      ;;
  esac
  exit 1
fi
if [ "$1" = "pr" ] && [ "$2" = "list" ]; then
  cat ${JSON.stringify(prState)} 2>/dev/null || true
  exit 0
fi
if [ "$1" = "pr" ] && [ "$2" = "close" ]; then
  : > ${JSON.stringify(prState)}
  exit 0
fi
exit 0
`,
    { mode: 0o755 },
  )
  chmodSync(stub, 0o755)
  return stub
}

/*
 * `os.tmpdir()` is whatever TMPDIR says, and TMPDIR is not always an absolute
 * path that exists: a sandbox that sets it to a relative `.tmp` made every
 * scenario below fail on `mkdtemp ENOENT` while the same test passed on the
 * machine it was written on. Fall back to a directory that certainly exists,
 * and never resolve a relative one - that would drop fixtures into the repo.
 */
function fixtureRoot() {
  const t = tmpdir()
  if (isAbsolute(t) && existsSync(t)) return t
  return '/tmp'
}

function runScenario({ humanCommit, branchAfterBump = false, botExtraFile = false }) {
  const root = mkdtempSync(join(fixtureRoot(), 'carve-bump-'))
  const carve = buildCarveRemote(root)
  const downstreamBare = buildDownstream(root, carve, { humanCommit, branchAfterBump, botExtraFile })

  const binDir = join(root, 'bin')
  const log = join(root, 'gh.log')
  const prState = join(root, 'pr-open.txt')
  writeFileSync(log, '')
  writeFileSync(prState, '723\n')
  writeGhStub(binDir, { downstreamBare, log, prState })
  writeFileSync(
    join(binDir, 'compare.txt'),
    humanCommit ? 'human@example.com|human@example.com\n' : `${BOT_EMAIL}|${BOT_EMAIL}\n`,
  )

  const scriptPath = join(root, 'bump.sh')
  writeFileSync(scriptPath, extractBumpScript())

  const cwd = join(root, 'run')
  mkdirSync(cwd, { recursive: true })

  let status = 0
  let output = ''
  try {
    output = execFileSync('bash', [scriptPath], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PATH: `${binDir}:${process.env.PATH}`,
        GH_TOKEN: 'stub',
        REPO: 'markup-carve/carve-rs',
        SUB: 'spec',
        TEST_CMD: 'echo "conformance must not run on the skip path"; exit 1',
        ALLOWLIST: 'none',
        CARVE_REMOTE: `file://${carve.bare}`,
        CODEX_API_KEY: '',
        GIT_CONFIG_COUNT: '1',
        GIT_CONFIG_KEY_0: 'protocol.file.allow',
        GIT_CONFIG_VALUE_0: 'always',
      },
    })
  } catch (err) {
    status = err.status ?? 1
    output = `${err.stdout ?? ''}${err.stderr ?? ''}`
  }

  const result = {
    status,
    output,
    calls: readFileSync(log, 'utf8'),
    prStillOpen: existsSync(prState) && readFileSync(prState, 'utf8').trim() !== '',
    carve,
  }
  // Several git repositories per scenario; leaving them behind fills the temp
  // directory over a run of the suite.
  rmSync(root, { recursive: true, force: true })
  return result
}

test('the Bump step carries no workflow templating, so it can be run as written', () => {
  const script = extractBumpScript()
  assert.ok(script.includes('CARVE_SHA='), 'extracted the wrong block')
  assert.ok(
    !script.includes('${{'),
    'the Bump script gained a `${{ }}` expression - move it to the step `env:` so the script stays executable',
  )
})

test('a bump that already matches closes the bump PR the workflow itself left open', () => {
  const { status, output, calls, prStillOpen } = runScenario({ humanCommit: false })

  assert.equal(status, 0, `the skip path should exit 0\n${output}`)
  assert.ok(
    !output.includes('conformance must not run on the skip path'),
    'conformance ran even though there was nothing to bump',
  )
  assert.match(output, /already pins carve/, `expected the skip message\n${output}`)
  assert.match(
    calls,
    /^pr close 723 /m,
    `the orphaned bump PR was left open - this is carve#850's defect\ngh calls:\n${calls}\noutput:\n${output}`,
  )
  assert.equal(prStillOpen, false, 'the orphaned bump PR is still open')
})

test('a bump that already matches leaves a PR carrying human commits open', () => {
  const { status, output, calls, prStillOpen } = runScenario({ humanCommit: true })

  assert.equal(status, 0, `the skip path should exit 0\n${output}`)
  assert.match(
    output,
    /carries 1 non-workflow commit\(s\) -> preserving/,
    `the human commit was not detected, so this scenario proves nothing\n${output}`,
  )
  assert.doesNotMatch(
    calls,
    /^pr close /m,
    `a PR with human commits on it was closed by the workflow\ngh calls:\n${calls}\noutput:\n${output}`,
  )
  assert.equal(prStillOpen, true, 'the human PR was closed')
})

/*
 * Bot identity does not by itself mean "carries only a bump". With
 * CODEX_API_KEY set, the codex attempt in this same step is committed under the
 * bot identity, so a bot-authored branch can hold an implementation. Closing
 * that PR and deleting its branch would throw the work away.
 */
test('a bot branch that also changes files outside the submodule is left open', () => {
  const { status, output, calls, prStillOpen } = runScenario({
    humanCommit: false,
    botExtraFile: true,
  })

  assert.equal(status, 0, `the skip path should exit 0\n${output}`)
  assert.match(
    output,
    /left PR #723 open \(it carries changes outside spec\)/,
    `expected the workflow to notice the non-bump content\n${output}`,
  )
  assert.doesNotMatch(
    calls,
    /^pr close /m,
    `a branch carrying an implementation was closed and deleted\ngh calls:\n${calls}\noutput:\n${output}`,
  )
  assert.equal(prStillOpen, true, 'the PR carrying an implementation was closed')
})

/*
 * The scenario above exits through the "pushed the merge of main" branch, so it
 * never reaches the guard that protects a human PR when there is nothing to
 * push. Removing that guard left it GREEN. This is the same branch and a human
 * whose branch already contains main: the merge is a no-op, so the exit falls
 * through to the guard itself.
 */
test('a human bump PR that is already up to date is left open, not closed', () => {
  const { status, output, calls, prStillOpen } = runScenario({
    humanCommit: true,
    branchAfterBump: true,
  })

  assert.equal(status, 0, `the skip path should exit 0\n${output}`)
  assert.match(
    output,
    /carries 1 non-workflow commit\(s\) -> preserving/,
    `the human commit was not detected, so this scenario proves nothing\n${output}`,
  )
  assert.doesNotMatch(
    output,
    /pushed the merge of main/,
    `the merge produced a commit, so this scenario exits before the guard it exists to test\n${output}`,
  )
  assert.match(output, /leaving the open bump PR alone/, `expected the guard to report itself\n${output}`)
  assert.doesNotMatch(
    calls,
    /^pr close /m,
    `a PR with human commits on it was closed by the workflow\ngh calls:\n${calls}\noutput:\n${output}`,
  )
  assert.equal(prStillOpen, true, 'the human PR was closed')
})
