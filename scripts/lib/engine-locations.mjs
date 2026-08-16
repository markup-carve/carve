/*
 * Where the sibling engine checkouts live.
 *
 * Shared so a second differential runner cannot drift from the first about
 * which directory "the php engine" means. Both honor the same env vars, which
 * is how CI points at checkouts that are not siblings.
 */
import { existsSync } from 'node:fs'
import { isAbsolute, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)))

export const rustDir = () => process.env.CARVE_RS_DIR ?? resolve(root, '../carve-rs')
export const phpDir = () => process.env.CARVE_PHP_DIR ?? resolve(root, '../carve-php')

/*
 * WHERE THE carve-rs BINARY IS, shared by every runner that needs one.
 *
 * `CARGO_TARGET_DIR` moves every cargo artifact out of the checkout, which is
 * the convention on a machine that runs several carve-rs sessions at once - a
 * full build is roughly 17G and parallel checkouts otherwise fill the disk. A
 * resolver that only looks under `<checkout>/target` therefore reports "not
 * built" for a binary that exists and is fresh.
 *
 * That is worse than an inconvenience because of what sits underneath it. Seven
 * runners resolved this path, each with its own copy of the same two-element
 * list, and three of them (engine-claims, degradation-claims, fmt-fixture-
 * claims) treat an unresolved binary as "this engine is not here" - so on the
 * recommended machine configuration they compared TWO engines and said nothing
 * about the third. A gate that silently drops a participant is the defect class
 * this repo keeps finding; the fix is one resolver, not seven (carve#1287).
 *
 * Order matters: when CARGO_TARGET_DIR is set, cargo writes THERE, so a
 * `target/` still sitting in the checkout is a leftover from before the
 * variable was set and must not win.
 */
export function rustBinaryCandidates(dir = rustDir()) {
  const candidates = []
  const targetDir = process.env.CARGO_TARGET_DIR
  if (targetDir) {
    // cargo resolves a relative CARGO_TARGET_DIR against the directory cargo
    // itself ran in, which for this binary is the carve-rs checkout and never
    // this repo. Resolving it against `root` would invent a path nothing built.
    const base = isAbsolute(targetDir) ? targetDir : resolve(dir ?? root, targetDir)
    candidates.push(join(base, 'release/carve'), join(base, 'debug/carve'))
  }
  // ABSOLUTE, always. `CARVE_RS_DIR` may be relative - docs/implementation-
  // comparison.md spells it `../carve-rs` - and compare-impls spawns this
  // binary with `cwd` set to the checkout. A path relative to THIS repo is
  // then re-resolved against the checkout and lands where nothing built:
  // `vendor/carve-rs` becomes `vendor/carve-rs/vendor/carve-rs/...` and the
  // spawn fails ENOENT, so the runner drops carve-rs and exits 2. The runners
  // that spawn WITHOUT a cwd never saw it, which is why only one of the seven
  // was affected. `resolve` anchors against this process's cwd, the same base
  // `existsSync` above uses, so the check and the spawn cannot disagree.
  if (dir) candidates.push(resolve(dir, 'target/release/carve'), resolve(dir, 'target/debug/carve'))
  return candidates
}

/** The first carve-rs binary that exists, or null when the checkout is unbuilt. */
export function rustBinary(dir = rustDir()) {
  return rustBinaryCandidates(dir).find((candidate) => existsSync(candidate)) ?? null
}
