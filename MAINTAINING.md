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

### Resolved (now pinned in the corpus)

These were verified carve-js ↔ carve-php differences; both impls now agree and
the behavior is pinned in `docs/examples.md`:

| Input | Resolution |
|-------|------------|
| `[x]{title="a\"b"}` — escaped quote in a quoted value | A backslash escapes ASCII punctuation in a quoted value (grammar `quoted_value` + `escaped_char`); value is `a"b`. carve-js gained escape support to match carve-php. *(64-attribute-edge-cases)* |
| `# H {???}` — heading attr block with no valid attribute | Grammar `attribute_list` needs ≥ 1 attribute, so the block is heading text. carve-js stopped dropping it. *(64-attribute-edge-cases)* |
| `text\n[^f]: note` — footnote defined but never referenced | No endnotes section is emitted. carve-php stopped leaking an empty `<ol>`. *(43-footnotes)* |
| Mention URL template | Canonical placeholder `{name}` for mentions and tags, value URL-encoded. carve-js accepts `{name}` (with `{user}` as a legacy alias); carve-php encodes the value. Config-only, so not corpus-testable. |
| `[x]{}` — bracket + empty attribute block | A valid attribute block forms a span even when empty; both emit `<span>x</span>` (carve-js now materializes the empty span, matching carve-php/djot). *(66-inline-span)* |
| `[x]{ }` / `[x]{???}` / `[x]{=y=}` — bracket + whitespace/invalid attr block | A whitespace-only block is a valid empty block → `<span>x</span>` (all impls); an invalid block is not an attribute block → the `]` and `{...}` stay literal, inner content still inline-parsed (`[*x*]{???}` → `[<strong>x</strong>]{???}`). carve-php stopped leaking the block (markup-carve/carve-php#43). Normative in grammar §14 and pinned across all three impls *(66-inline-span)*. The boundary of "yields an attribute" still diverges at the margins (carve-php-only: booleans, colon keys, comment-only blocks), so those are deliberately not pinned. |
| `> quoted`<br>`continued` — lazy blockquote continuation | A non-`>` line that is not blank and not an invisible interrupter (reference/footnote/abbreviation definition or comment) or a caption continues the quote (CommonMark-style). carve-php already did this; carve-js gained it (markup-carve/carve-js#63). Grammar blockquote section made explicit. Matches Djot upstream. *(77-blockquote-lazy-continuation)* |
| `` ```c++ `` — fenced language tag with punctuation | `language_info` widened to allow `+ # .` so `c++`/`c#`/`f#`/`asp.net` are code blocks; the token stays single, so a multiword/quoted info (`` ```js title="x" ``) is still a non-fence. carve-js widened `RE_FENCE` (markup-carve/carve-js#64); carve-php already accepted these. *(78-fenced-code-language-with-punctuation)* |
| `# Title`<br>`outside` — multi-line headings | A heading spills onto following lines until a blank line (like Djot, and like blockquotes; §10). A same-or-lower `#` (stripped) or plain line folds in; a higher/other marker, caption, or `%%%` ends it. The id uses the full folded text. carve-php already folded; carve-js gained it (markup-carve/carve-js#65), and carve-php renders the continuation flush (markup-carve/carve-php#52). *(79-multi-line-headings)* |
| `text`<br>`` ``` ``<br>`code` — backtick run with no equal-length closer | The opener is a maximal backtick run; it closes only on a run of the same length, else it opens an inline verbatim span that runs to end of block (block trailing whitespace stripped). Such an unclosed run is opaque, so an emphasis/link after it is verbatim content. carve-php and Djot upstream already did this; carve-js stopped leaving the run as literal text and stopped shrinking the opener (markup-carve/carve-js#73). Grammar `code_span` made explicit. *(12-inline-code, 80-blockquote-lazy-continuation-stops-at-a-fenced-block)* |

### Intentional divergences (kept on purpose)

_None currently._

### Open (tracked)

_None currently._

When a new divergence is found, verify it on both impls, decide the canonical,
and either pin it as a `docs/examples.md` pair (and move it to *Resolved*) or
record it as *Intentional* with the reason, or under *Open (tracked)* if it is
an implementation bug still being worked through.
