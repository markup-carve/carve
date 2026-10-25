import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, chmodSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

const bin = mkdtempSync(join(tmpdir(), 'carve-release-probe-'))
const gh = join(bin, 'gh')
writeFileSync(gh, `#!/usr/bin/env bash
if [[ "$2" == "repos/test/release/releases" ]]; then
  if [[ "$MOCK_RELEASE" == "missing" ]]; then echo '[]'; else echo '[{"id":77,"tag_name":"0.1.99","draft":true}]'; fi
elif [[ "$*" == *PATCH* ]]; then
  echo '{"id":77}'
else
  if [[ "$MOCK_RELEASE" == "bad" ]]; then
    echo '{"tag_name":"untagged-77","draft":true,"target_commitish":"abc"}'
  else
    echo '{"tag_name":"0.1.99","draft":false,"target_commitish":"abc"}'
  fi
fi
`)
chmodSync(gh, 0o755)

for (const [mode, shouldPass] of [['missing', false], ['bad', false], ['good', true]]) {
  test(`publish read-back: ${mode}`, () => {
    const result = spawnSync('bash', ['scripts/publish-release-notes.sh', '0.1.99', 'abc'], {
      cwd: new URL('..', import.meta.url),
      env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, GITHUB_REPOSITORY: 'test/release', MOCK_RELEASE: mode },
      encoding: 'utf8',
    })
    assert.equal(result.status === 0, shouldPass, result.stderr + result.stdout)
  })
}
