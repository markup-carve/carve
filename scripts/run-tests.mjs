// Runs every tests/*.test.mjs as an explicit, sorted file list: Node's own
// directory and glob arguments differ across the versions CI runs.
import { readdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..')

export function testFiles(root = repo) {
  return readdirSync(join(root, 'tests'))
    .filter((name) => name.endsWith('.test.mjs'))
    .sort()
    .map((name) => `tests/${name}`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = spawnSync(process.execPath, ['--test', ...process.argv.slice(2), ...testFiles()], {
    cwd: repo,
    stdio: 'inherit',
  })
  process.exit(result.status ?? 1)
}
