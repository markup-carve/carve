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
 * `carve` - the canonical writer - pairs with `.fmt`, NOT with `.crv`.
 *
 * It was absent entirely until now, on the grounds that a second home for
 * Carve-source expectations would put two files named `NN-slug.crv` in one
 * directory. That reasoning was about the EXTENSION, not about the target: a
 * distinct suffix has no collision, and `.fmt` keeps every `.crv` walker in the
 * repo (corpus tests, the generator, the roundtrip runner) seeing exactly the
 * inputs it saw before.
 *
 * What being absent cost: `compare:impls` reported the writer as
 * `carve: compared=557 diffs=9 fixtures=none`. Nine disagreements between the
 * three engines, and no way to say which one was right - the only check on the
 * writer was the engines agreeing with each other, which says nothing when they
 * do agree and cannot adjudicate when they do not.
 */
export const TARGET_EXTENSIONS = {
  html: 'html',
  markdown: 'md',
  plain: 'txt',
  ansi: 'ansi',
  carve: 'fmt',
}

export const DEFAULT_TARGET = 'html'

/*
 * Every target the engines are compared on.
 *
 * Now the same set as `TARGET_EXTENSIONS`, but they stay separate lists on
 * purpose: they answer different questions ("is this compared?" and "where does
 * its expected output live?"), and collapsing them is what carve#590 did - it
 * asked the pairing rule for a filename the map did not have, and every
 * `compare:impls` run died on the first document.
 *
 * `fixturelessTargets()` returning empty is the current state, not a guarantee.
 * A target added here without an extension is compared engine-against-engine
 * only, which tests/corpus-targets.test.mjs reports rather than forbids.
 */
export const COMPARISON_TARGETS = ['html', 'markdown', 'plain', 'carve', 'ansi']

/** Targets compared with no expected file anywhere - engine agreement only. */
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
