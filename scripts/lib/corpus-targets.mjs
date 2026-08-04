/*
 * The pairing rule for corpus cases that pin a render target.
 *
 * A case in the optional corpus may name a `target` in its manifest entry. The
 * expected file's extension follows from that target, so a runner locates the
 * expected output from the slug and the target alone
 * (tests/corpus-optional/README.md).
 *
 * This lives in one place because it has to hold for every runner. It did not:
 * carve#360 taught the vendored-reference runner about targets and left
 * `scripts/compare-impls.mjs` pairing every optional case with a `.html` file,
 * so `npm run compare:impls -- --corpus=optional` died on the first
 * Markdown-target case with ENOENT.
 */

/*
 * `carve` is deliberately absent. Carve-source expectations live in
 * tests/corpus-roundtrip/, and giving them a second home here would mean two
 * files named `NN-slug.crv` in one directory, one of them the input.
 */
export const TARGET_EXTENSIONS = {
  html: 'html',
  markdown: 'md',
  plain: 'txt',
  ansi: 'ansi',
}

export const DEFAULT_TARGET = 'html'

/*
 * Every target the engines are compared on.
 *
 * A SUPERSET of `TARGET_EXTENSIONS`: `carve` is compared engine-against-engine
 * but has no expected file here, so the two lists are not interchangeable and
 * a runner that treats them as one asks the pairing rule for a filename that
 * does not exist. carve#590 did exactly that and every `compare:impls` run
 * died on the first document.
 *
 * It lives beside the extensions map so the difference between "compared" and
 * "has a fixture" is visible in one place, and tests/corpus-targets.test.mjs
 * pins what the difference is allowed to be.
 */
export const COMPARISON_TARGETS = ['html', 'markdown', 'plain', 'carve', 'ansi']

/** Targets compared without an expected file - `carve` lives in corpus-roundtrip/. */
export function fixturelessTargets() {
  return COMPARISON_TARGETS.filter((t) => !Object.hasOwn(TARGET_EXTENSIONS, t))
}

export function targetNames() {
  return Object.keys(TARGET_EXTENSIONS)
}

/** The target a manifest entry pins, defaulting to html. */
export function targetOf(entry) {
  return entry.target ?? DEFAULT_TARGET
}

/**
 * The expected-output filename for a slug on a target.
 *
 * An unknown target is a manifest error, not an unsupported feature: returning
 * a `.html` fallback would silently pair the case with the wrong file, which is
 * exactly the failure this module exists to prevent.
 */
export function expectedFileFor(slug, target = DEFAULT_TARGET) {
  const extension = TARGET_EXTENSIONS[target]
  if (!extension) {
    throw new Error(
      `unknown target '${target}' for '${slug}' - expected one of ${targetNames().join(', ')}`,
    )
  }
  return `${slug}.${extension}`
}
