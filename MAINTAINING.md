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

`carve` consumes carve-js as a **git dependency pinned to an exact commit**:
`@markup-carve/carve` in `devDependencies` (`github:markup-carve/carve-js#<sha>`).
`npm run bump-carve-pin [sha|ref]` moves the pin; that one line is the whole
statement of which reference build the corpus and the Playground run against.
The corpus is generated separately by `scripts/generate-corpus.mjs`, which
extracts the ` ```carve ` / ` ```html ` pairs from `docs/examples.md`
**verbatim** (`npm run corpus:build` + `git diff --exit-code`).

**The corpus oracle is the executable spec, not an engine.** `tests/corpus.test.mjs`
renders every pair through `scripts/spec` (the layout automaton plus the
PART 9R / PART 10 renderer driven by `resources/carve-core.ohm`), and
`npm run core:check` adds the refusal ratchet over the same oracle. So this repo
can prove its own fixtures are self-consistent without waiting for an
implementation to ship the rule, and each engine verifies ITSELF against the
corpus through its own spec submodule — which is where an engine-versus-corpus
disagreement belongs.

The pinned build is still exercised, just not as the corpus oracle: the Tier-2
`tests/optional-corpus.test.mjs`, the PART 11 `tests/roundtrip.test.mjs`, the
prose `tests/examples.test.mjs` and the option cases in
`tests/reference-build.test.mjs` all run through it, because none of those can be
expressed by Core-only fixtures. `npm run engine:report` prints how the pinned
build compares to the whole corpus; it is a report for pin bumps, deliberately
NOT a blocking gate.

The compiled `dist/` used to be vendored at `docs/.vitepress/carve-lib/`. It is
not any more: a few hundred rebuilt artifacts per refresh were unreviewable, the
carve-js commit they came from was recorded only in changelog prose, and a
re-vendor from a stale checkout silently reverted merged impl behavior.

Each implementation carries a git submodule pointing back at `carve`
(`spec` in carve-js, `tests/spec` in carve-php). Keeping those current is
automated by the `Bump spec corpus` workflow (`.github/workflows/bump-spec.yml`)
in each impl repo — weekly + manual dispatch, idempotent on a single
`automation/bump-spec` branch.

### Order for a cross-cutting behavior change

1. **carve-js first.** Land the behavior in the reference impl with unit tests.
   Merge to `main`.
2. **carve next.** Add the `docs/examples.md` pair(s), cover the rule in
   `scripts/spec` so the executable spec renders it, then `npm run corpus:build`
   and `npm test`. Commit the examples, the regenerated corpus and the
   executable-spec change together. Bump the pin
   (`npm run bump-carve-pin`, *merged* carve-js main only) when the reference
   build should follow — required if the change touches the Tier-2 corpus, the
   PART 11 round-trip fixtures or the prose examples, since those still run
   through the pinned build.

   A **Core-only** rule no longer needs step 1 to have landed first: the
   executable spec gates it. Keeping carve-js first is still the smoother path
   for a cross-cutting change, because the engine work usually exposes the edge
   cases the examples should pin.
3. **carve-php (and any other impl).** Bump `tests/spec` to the new carve main
   (the automation does this), make the impl match the new pairs, and promote any
   newly passing categories in `tests/CarveCorpusTest.php`.

### Coordination rules (avoid duplicate / reverting PRs)

- **Check `gh pr list` in all three repos before opening a PR.** Parallel
  automation has produced duplicate PRs (e.g. two identical submodule bumps);
  reuse or close the existing one rather than stacking another.
- **One dedicated branch per task.** The bump automation deliberately reuses a
  single `automation/bump-spec` branch so re-runs update one PR.
- **Never pin a carve-js commit that is not merged to `main`.** Pinning a
  branch build reverts impl changes that landed after it. `npm run bump-carve-pin`
  defaults to carve-js `main` for exactly this reason; pass an explicit sha only
  when it is an ancestor of `main`.

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
| `-{.c} text` / `1.{#x} text` — list-item attributes | An attribute block **abutting** the marker attributes the `<li>`; a space before `{` makes it ordinary content. Shipped in all three impls (carve-php native; carve-js #135-era work; carve-rs #30). *(87-list-item-attributes)* |
| `{.glossary}` line before a definition list | A preceding block-attribute line floats onto the `<dl>` (§15) like every other block. carve-js stopped dropping it. *(45-definition-lists)* |
| `![a](x){.img}` + caption — figure/image attributes | A **trailing** attribute stays on `<img>` even inside a `<figure>`; a **preceding** block-attribute line targets the `<figure>`. carve-php fixed its trailing-attr relocation and preceding-line drop. *(08-image-with-caption-2/3)* |
| `` $`x`{.c} `` — trailing attribute on math | Applied, merging into the `math inline`/`math display` class; `{=format}` stays code-span-only. carve-php stopped dropping math attrs. *(42-math)* |
| `::: note {.x}` — attribute-bearing colon-fence opener | STRICT (djot): the opener carries NO inline attributes — any trailing `{…}` (typed or bare opener) makes the line an ordinary paragraph (carve-js #149; carve-php and carve-rs followed). This REVERSED the earlier draft canonical (apply-to-element). *(44-generic-divs-2, 88-line-blocks-5, 13-admonitions)* |
| `## H {.x}` — trailing attribute on a heading line | STRICT (djot): a heading line carries NO trailing `{…}` block — it is ordinary inline content, id from the full literal text; attributes come from a preceding block-attribute line, explicit id hoists to the `<section>` (carve-js #153, spec #123, carve-php #130, carve-rs #38). *(02-headings, 17-attributes, 19-heading-ids)* |
| `@john.doe` — interior dot in a mention name | A dot followed by another name character continues the name; a trailing dot is sentence punctuation. Grammar `mention_name`/`tag_name` = `name_word, {'.', name_word}` (spec #127); tags already conformed everywhere, mentions fixed in carve-php #132 + carve-rs #40. *(89-mention-and-tag-name-boundaries)* |
| `@john's` — smart quote directly after an inline span | The apostrophe is a RIGHT single quote (flanking substitution, §8); carve-rs now takes a leading quote's flanking context from the preceding inline sibling (carve-rs #40). *(89-mention-and-tag-name-boundaries)* |
| `- - A`<br>`  - B` — sub-list opened on a parent item's marker line | An ordinary persistent nested list: following same-indent markers MERGE into one list, and a post-blank indented block is ABSORBED into the open nested item. Matches reference djot.js (`@djot/djot`) and CommonMark. This is a bug fix correcting a narrower reading carve inherited from djot-php (the nested list did not persist), NOT a divergence. Shipped in all three impls (carve-js #214, carve-php #196, carve-rs #104). *(103-marker-line-nested-lists)* |

### Intentional divergences (kept on purpose)

_None currently._

### Open (tracked)

Decided canonical behavior, pinned in the corpus, where at least one
implementation still diverges (lockstep order: carve-js first, then the carve
pin; the corpus has no xfail). A row moves to *Resolved* once all impls agree.

_None currently._

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
