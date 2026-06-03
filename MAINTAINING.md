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

### Intentional divergences (kept on purpose)

_None currently._

### Open (tracked)

Two carve-php ↔ carve-js differences found June 2026 while building the
Markdown→Carve converters (markup-carve/carve-js#62, markup-carve/carve-php#50).
Both are deliberate carve-php behaviors, not bugs — carve-php is the broader
(more CommonMark-/feature-compatible) implementation and carve-js follows the
narrow core grammar. The Markdown→Carve converters already cope (each targets
its own parser), so no converter change is blocked on either.

**Lazy blockquote continuation — DECIDED: carve-php is canonical.** A non-`>`
line that follows a blockquote line, is not blank, and is not an invisible
interrupter (reference/footnote/abbreviation definition or comment) or a caption
continues the quote (CommonMark-style), as carve-php's commented "Lazy
continuation" branch in `BlockParser::tryParseBlockQuote` already did. The
grammar is now explicit (`resources/grammar.ebnf`, blockquote section). In
progress: carve-js gains the behavior in markup-carve/carve-js#63; once merged,
add a `docs/examples.md` pair + regenerated corpus and confirm carve-php still
matches, then move this to *Resolved*. (Independent, still-open sub-difference:
a quoted **heading** followed by a lazy line — carve-php folds it into the
heading text, carve-js keeps it as a following paragraph; this reproduces with
no blockquote at all, `# Title\noutside`, so it is a separate heading-parsing
divergence to track on its own.)

**Fenced code info string — OPEN (maintainer decision needed).**

| carve-js | carve-php | Why it is not a simple bug |
|----------|-----------|----------------------------|
| Single optional `[A-Za-z0-9_-]*` token, anchored (`RE_FENCE` in `src/parse.ts`). `` ```c++ ``, `` ```js title="x" `` are **not** fences → inline code span. | Accepts a rich info string: punctuated languages (`c++`, `c#`) and a `[Label]` token for code groups / tabs. | carve-php's permissiveness is required by `CodeGroupExtension` and asserted by `CodeGroupExtensionTest::testLanguageWithSpecialChars`. The grammar's `language_info = [A-Za-z0-9_-]+` (`resources/grammar.ebnf:94`) is narrower than what carve-php deliberately supports — so the grammar, not carve-php, is the incomplete thing here. |

Recommended resolution: **widen the core `language_info`** to a single
no-whitespace info token over a real-language charset (add `+ # .`, e.g.
`(letter | digit | '-' | '_' | '+' | '#' | '.')+`) so `c++`/`c#`/`f#` become
valid fences, and bring carve-js's `RE_FENCE` up to match (`` ```c++ `` becomes
a code block in both). Keep a trailing `[Label]` / `{attributes}` as separate
optional tokens handled by the code-group extension / attribute parser, not as
part of `language_info` — i.e. do **not** bless carve-php's "whole rest of the
line becomes the language" (which yields a broken `class="language-js title=…"`).
A genuinely multiword info (`js title="x"`) then stays a non-fence in both. When
decided, update `grammar.ebnf`, pin a `docs/examples.md` pair, and move this to
*Resolved*.

When a new divergence is found, verify it on both impls, decide the canonical,
and either pin it as a `docs/examples.md` pair (and move it to *Resolved*) or
record it as *Intentional* with the reason, or under *Open (tracked)* if it is
an implementation bug still being worked through.
