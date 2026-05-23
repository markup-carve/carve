# Maintaining the Carve ecosystem

Three repositories move in lockstep:

| Repo | Role |
|------|------|
| [`carve`](https://github.com/markup-carve/carve) | Specification. `resources/grammar.ebnf` is **normative**; `docs/examples.md` generates the `tests/corpus/*.crv` + `*.html` pairs that are the **cross-impl conformance contract**. |
| [`carve-js`](https://github.com/markup-carve/carve-js) | Reference implementation (TypeScript). Its compiled output is vendored into `carve` to render the docs and validate the corpus. |
| [`carve-php`](https://github.com/markup-carve/carve-php) | PHP implementation. Conforms to the same corpus. |

## The lockstep

`carve` vendors a **compiled copy of carve-js** at `docs/.vitepress/carve-lib/`.
`scripts/sync-carve-lib.mjs` is the **single source for re-vendoring**: it builds
`../carve-js` (a hardcoded sibling checkout) and copies its `dist/`. The corpus is
generated separately by `scripts/generate-corpus.mjs`, which extracts the
` ```carve ` / ` ```html ` pairs from `docs/examples.md` **verbatim**; CI then
verifies those pairs against the vendored carve-lib (`npm run corpus:build` +
`git diff --exit-code` + `npm test`).

Each implementation carries a git submodule pointing back at `carve`
(`spec` in carve-js, `tests/spec` in carve-php). Keeping those current is
automated by the `Bump spec corpus` workflow (`.github/workflows/bump-spec.yml`)
in each impl repo — weekly + manual dispatch, idempotent on a single
`automation/bump-spec` branch.

### Order for a cross-cutting behavior change

1. **carve-js first.** Land the behavior in the reference impl with unit tests.
   Merge to `main`.
2. **carve next.** Add the `docs/examples.md` pair(s), then
   `npm run sync-carve-lib` (re-vendor from the *merged* carve-js main),
   `npm run corpus:build`, and `npm test`. Commit the examples, the regenerated
   corpus, and the re-vendored carve-lib together.
3. **carve-php (and any other impl).** Bump `tests/spec` to the new carve main
   (the automation does this), make the impl match the new pairs, and promote any
   newly passing categories in `tests/CarveCorpusTest.php`.

### Coordination rules (avoid duplicate / reverting PRs)

- **Check `gh pr list` in all three repos before opening a PR.** Parallel
  automation has produced duplicate PRs (e.g. two identical submodule bumps);
  reuse or close the existing one rather than stacking another.
- **One dedicated branch per task.** The bump automation deliberately reuses a
  single `automation/bump-spec` branch so re-runs update one PR.
- **Never re-vendor carve-lib from a carve-js that lags `main`.** Re-vendoring
  reverts impl changes that were merged after the vendored snapshot. Always
  re-vendor from merged carve-js `main`, and confirm the vendored diff contains
  *only* the intended change before committing.

## Known cross-impl divergences

Verified differences between carve-js and carve-php that are **not yet pinned in
the corpus** because each needs a canonical decision. "Recommended" is the
grammar-aligned or reference-aligned resolution; none are settled until pinned.

| # | Input | carve-js | carve-php | Recommended canonical |
|---|-------|----------|-----------|------------------------|
| 1 | Mention URL template | placeholder `{user}`, value `encodeURIComponent`d | placeholder `{name}`, value **not** encoded | Unify on `{name}` for mentions *and* tags, and URL-encode the value. (carve-js `{user}`→`{name}` is a breaking API change; carve-php gains encoding.) |
| 2 | `[x]{title="a\"b"}` — escaped quote in a quoted value | `\"` is literal, so the value ends at the first `"`; the block is invalid → literal text | `\"` is an escape → value is `a"b` | Grammar `quoted_value = '"', {character - '"'}, '"'` has **no** escape; carve-js is grammar-aligned. Either drop carve-php's escape support or add an escape rule to the grammar. |
| 3 | `[x]{"{y}"}` — span attr block with no valid attribute | falls through to literal `[x]{"{y}"}` | emits an empty `<span>x</span>` | carve-js. An attribute block yielding no id/class/key is not a span (already documented for carve-js spans); carve-php should fall through to literal. |
| 4 | `# H {???}` — heading attr block with no valid attribute | drops the block → `<h1>H</h1>` (content loss) | keeps it as heading text → `<h1>H {???}</h1>` | carve-php. Grammar `attribute_list` requires ≥ 1 attribute, so an attribute-less block is inline content; carve-js should keep it literal. |
| 5 | `text\n[^f]: note` — footnote defined but never referenced | emits nothing | emits an empty `<section role="doc-endnotes">` with an empty `<ol>` | carve-js. Omit the endnotes section when no footnote is referenced. |

When one of these is resolved, add the agreed output as a `docs/examples.md`
pair so it becomes part of the conformance contract, and update or remove its row
here.
