# Maintaining the Carve ecosystem

The spec and three implementations move in lockstep:

| Repo | Role |
|------|------|
| [`carve`](https://github.com/markup-carve/carve) | Specification. `resources/grammar.ebnf` is **normative**; `docs/examples.md` generates the `tests/corpus/*.crv` + `*.html` pairs that are the **cross-impl conformance contract**. |
| [`carve-js`](https://github.com/markup-carve/carve-js) | Reference implementation (TypeScript). Its compiled output is vendored into `carve` to render the docs and validate the corpus. |
| [`carve-php`](https://github.com/markup-carve/carve-php) | PHP implementation. Conforms to the same corpus. |
| [`carve-rs`](https://github.com/markup-carve/carve-rs) | Rust implementation. Conforms to the same corpus. |

### Output renderers

All three implementations (`carve-js`, `carve-php`, `carve-rs`) are **multi-target
renderers**: besides the corpus-validated **HTML**, each emits **Markdown**,
**plain text**, and **ANSI**. Only HTML has a cross-impl corpus contract; the
non-HTML renderers have no spec corpus, so they are kept **byte-identical to
`carve-php`** (the reference for non-HTML output) via golden fixtures — a battery
of carve inputs rendered by carve-php, asserted byte-for-byte by `carve-js` and
`carve-rs` test suites. When changing a non-HTML renderer, update that golden
battery and keep all three in agreement.

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
| `- a`<br>`  - b`<br>` c` — under-indented continuation after a sublist (dedent-landing-after-sublist) | Canonical = CommonMark lazy continuation: an under-indented non-blank line that does not start a new block folds into the **deepest** open paragraph, leading whitespace stripped, regardless of indent (0/1/2/3 spaces); a blank line before it makes it a fresh top-level paragraph (also stripped). carve-php adopted the lazy-fold (markup-carve/carve-php#82); carve-js stripped a paragraph first line's leading whitespace (markup-carve/carve-js#96). Resolves markup-carve/carve#65. *(81-list-lazy-continuation)* |

### Intentional divergences (kept on purpose)

_None currently._

### Open (tracked)

Decided canonical behavior. The **Pin** column says whether the conformance
pair is already in `docs/examples.md` (green against the canonical impl) or is
**held** until the listed impl PR lands; the corpus has no xfail, so a pin that
the vendored carve-js fails cannot land until carve-js implements it (lockstep
order: carve-js first, then the carve pin). A row moves to *Resolved* once both
impls agree and the pin is in the corpus.

| Input | Canonical | Impl(s) to change | Pin |
|-------|-----------|-------------------|-----|
| `-{.c} text` / `1.{#x} text` (list-item attributes, NEW Carve syntax) | An attribute block **abutting** the marker (no space before `{`) attributes the `<li>`; the marker's required space follows the block. A **space** before `{` makes it ordinary content (a leading inline `{…}` with no preceding node is literal), NOT a li-attribute. The whitespace is the discriminator. The carve-php lazy-continuation accident (trailing `{…}` line folded onto a tight item) is rejected as the mechanism. Grammar `item_attributes` (extends §15) is normative now. | BOTH: neither implements it. carve-js drops/literalizes; carve-php makes an inline span / swallows the leading block. | HELD (grammar landed; pin waits for both impls) |
| `{.glossary}` line before a definition list | carve-js: a preceding block-attribute line floats onto the `<dl>` (§15), like every other block. carve-php already does this. | carve-js must stop dropping it. | HELD (waits for carve-js) |
| `![a](x){.img}` + caption (figure/image attributes) | carve-js: a **trailing** attribute is the image's and stays on `<img>` even when wrapped in a `<figure>` (same target as a standalone block image); a **preceding** block-attribute line targets the `<figure>` (§15). carve-php is inconsistent: it moves the trailing attr to the `<figure>` (so the same `![a](x){.img}` hits a different element depending on whether a caption follows) and drops the preceding block-attr line. | carve-php must keep the image's trailing attr on `<img>` and float a preceding block-attr line onto `<figure>`. | **PINNED** *(08-image-with-caption-2/3)*, green on carve-js; carve-php red until fixed |
| `` $`x`{.c} `` / `` $$`x`{.c} `` (trailing attribute on math) | carve-js / djot.js: applies it, merging classes into the existing `math inline` / `math display` class; `#id` / `key=value` applied too. `{=html}` stays literal (both impls already agree; the `{=format}` raw form is code-span-only, not inherited). math reuses `code_span`, which carries the generic `[attributes]` slot. carve-php drops valid attrs. | carve-php must apply the math trailing attribute (merge into the math span class). | **PINNED** *(Math section)*, green on carve-js; carve-php red until fixed |
| `::: note {.x}` (trailing attribute on a TYPED colon-fence opener) | STRICT (djot): the opener line carries NO inline attributes — any trailing `{…}` (or other non-title text after the type) makes the line an ordinary PARAGRAPH, not a fence (grammar PART 2 / PART 9 §12; carve-js #149). Attributes attach via a preceding block-attribute line (§15). This REVERSES the earlier draft canonical (apply-to-element); carve-js is canonical now. carve-php still applies the trailing block. | carve-php must treat the typed opener with a trailing `{…}` as a paragraph. | HELD (waits for carve-php) |
| `## H {.x}` (trailing attribute on a HEADING line) | STRICT (djot): a heading line carries NO trailing `{…}` attribute block — it is ordinary inline content (literal text), and the heading id derives from the full literal text (grammar PART 2 headings; carve-js #153). Attributes attach via a preceding block-attribute line (§15); an explicit `#id` hoists to the `<section>` (§13). | carve-php and carve-rs still apply the trailing block; both must literalize it. | **PINNED** *(02-headings: preceding-line + literal-trailing pairs; 17-attributes, 19-heading-ids, 64-attribute-edge-cases-6/-12 rewritten to the preceding-line form)*, green on carve-js; carve-php/carve-rs red until fixed |
| `@john.doe` (interior dot in a mention name) | A dot followed by another name character CONTINUES the name (`@john.doe` is one mention); a trailing dot is sentence punctuation. Grammar `mention_name`/`tag_name` = `name_word, {'.', name_word}` (PART 9 §7). carve-js canonical (its URL-template path already handles dotted names); TAGS (`#release-1.0`) already work in all three — only the php/rs MENTION charset lacks the dot. | carve-php and carve-rs must accept interior dots in mention names. | **PINNED** *(89-mention-and-tag-name-boundaries)*, green on carve-js; carve-php/carve-rs red until fixed |
| `@john's` (smart quote directly after a mention) | The apostrophe is a RIGHT single quote (’) — flanking substitution, preceded by a non-whitespace character (PART 9 §8). carve-js and carve-php agree; carve-rs emits a LEFT quote (‘) after an inline span boundary. | carve-rs must use source-character flanking for the quote after an inline construct. | **PINNED** *(89-mention-and-tag-name-boundaries)*, green on carve-js + carve-php; carve-rs red until fixed |

### Extension API surface (parity beyond corpus output)

The conformance corpus pins *output*, not the *extension API*. Two
implementations can produce identical corpus output while exposing different
extension contracts, so that axis is tracked here separately.

The normative contract (`docs/extensions.md` section 2.1) has four parse/render
contribution points: an inline matcher, a block matcher, the `afterParse` and
`beforeRender` transforms, plus per-node renderers. Status:

| Impl | matchers (inline/block) | transforms | renderers |
|------|:---:|:---:|:---:|
| carve-php | ✅ | ✅ | ✅ |
| carve-rs | ✅ | ✅ | ✅ |
| carve-js | ✅ (markup-carve/carve-js#112) | ✅ | ✅ |

Resolved: carve-js originally shipped only transforms + renderers (matchers
were deferred), so the *portable* half of the contract (matchers + transforms)
was only half-portable. carve-js#112 added `matchInline` / `matchBlock` with a
`MatcherContext` that resolves the document's link/abbreviation/footnote
definitions, matching carve-php and carve-rs. All three impls now realize the
full four-point contract.

When a new divergence is found, verify it on both impls, decide the canonical,
and either pin it as a `docs/examples.md` pair (and move it to *Resolved*) or
record it as *Intentional* with the reason, or under *Open (tracked)* if it is
an implementation bug still being worked through.
