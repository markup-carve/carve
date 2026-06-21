# Carve vs Markdown, Djot & MDX

How Carve compares to the markup languages you already know. The short version:
Markdown's reach, Djot's consistency, web-native features by default - without
turning your content into a JavaScript program.

> This page is **Carve-centric**: a feature-by-feature take against Markdown,
> Djot, and MDX. For a broader, neutral survey of the wider lightweight-markup
> landscape (AsciiDoc, reStructuredText, Textile, and more), see
> [Modern Markup Languages Comparison](./markup-languages).

::: tip Legend
✅ native &nbsp;·&nbsp; 🧩 plugin / extension needed &nbsp;·&nbsp; ⚠️ partial / convention &nbsp;·&nbsp; ❌ not available
:::

## At a glance

|                                 | Markdown (CommonMark) | Djot | MDX | **Carve** |
|---------------------------------|:---:|:----:|:---:|:---:|
| Formal, normative grammar       | ⚠️ spec, ambiguous edges |  ✅   | ❌ (md + JSX) | ✅ EBNF |
| Consistent inline rules         | ❌ |  ✅   | ❌ | ✅ |
| No-backtracking parse guarantee | ❌ |  ✅   | ❌ | ✅ \* |
| Markdown-familiar syntax        | ✅ |  ⚠️  | ✅ | ⚠️ |
| Paragraph interruption (no blank line) | ✅ | ❌ | ✅ | ✅ \*\* |
| Feature completeness/consistency | ❌ | ❌ | ❌ | ✅ |

\* Inline parsing is single-pass with a delimiter stack; at the block level a
fence / `:::` opener uses a bounded forward scan for a matching closer
(closer lookahead, not backtracking) - see
[Technical Rationale](/technical-rationale).
\*\* Like Markdown for quotes, headings, tables and closed fences; list markers
(both bullet and ordered) deliberately never interrupt a paragraph - a list
needs a blank line (no CommonMark `1.`-only heuristic).

### Paragraph interruption, by rule count

How many distinct rules an author has to remember for "when does a block break
an open paragraph without a blank line". Fewer and more regular is easier to
learn and harder to get wrong. (Counts are author-facing rules, not formal
grammar productions, so they are approximate - the point is the regularity.)

| Model | Interruption rules |
|---|---|
| Markdown (CommonMark) | ~8–10, irregular - setext underline, ordered list only if it starts with `1`, indented code *can't* interrupt, HTML-block type 7 *can't*, bullet only if the first item is non-empty, … |
| MDX | inherits Markdown's (~8–10), plus JSX block handling |
| Djot | **1** - nothing interrupts; a blank line precedes every block |
| **Carve** | **3** - visible block-openers interrupt (heading, quote, table row, open fence, thematic break); list markers fold (never interrupt); fence / `:::` closers and bare images don't interrupt |

Carve trades Djot's single uniform rule for Markdown familiarity on the common
blocks, but keeps it to three regular rules instead of CommonMark's pile of
special cases.

## Authoring features

| | Markdown | Djot | MDX | **Carve** |
|---|:---:|:---:|:---:|:---:|
| Tables | 🧩 GFM | ✅ | 🧩 GFM | ✅ |
| Table rowspan / colspan | ❌ | ❌ | ❌ | ✅ |
| Footnotes | 🧩 | ✅ | 🧩 | ✅ |
| Math | 🧩 | ✅ | 🧩 | ✅ |
| Definition lists | 🧩 | ✅ | 🧩 | ✅ |
| Admonitions / callouts | 🧩 | ⚠️ via div | 🧩 component | ✅ native |
| Attributes `{.class #id}` | 🧩 (Pandoc, markdown-it-attrs) | ✅ | ⚠️ JSX props | ✅ |
| Generic divs / spans | 🧩 (Pandoc fenced divs / spans) | ✅ | ⚠️ components | ✅ |
| Smart typography | 🧩 | ✅ | 🧩 | ✅ |
| Editorial / critic markup | ❌ | ❌ | ❌ | ✅ |
| Frontmatter | ⚠️ tooling | ❌ | 🧩 | ✅ |
| Emoji shortcodes | 🧩 | ⚠️ | 🧩 | 🧩 `:emoji[…]` extension |

## Docs & cross-referencing

| | Markdown | Djot | MDX | **Carve** |
|---|:---:|:---:|:---:|:---:|
| Automatic heading ids | ⚠️ tooling | ✅ | 🧩 | ✅ case-preserving, case-insensitive refs |
| Cross-references `</#id>` | ❌ | ❌ | ❌ | ✅ |
| Implicit heading refs `[Heading][]` | 🧩 (Obsidian uses `[[…]]`) | ❌ | ❌ | ✅ |

## Safety & ecosystem

| | Markdown | Djot | MDX | **Carve** |
|---|:---:|:---:|:---:|:---:|
| Safe with untrusted input | ⚠️ raw HTML on by default (sanitize modes exist) | ✅ | ❌ executes JS | ✅ raw off by default |
| Embeds live components / JS | ❌ | ❌ | ✅ (its purpose) | ❌ by design |
| Independent implementations | many, divergent | several (js, lua, rust, go) | JS-only | **php · js · rs, conformance-tested** |
| Shared spec test corpus | ❌ | ⚠️ | ❌ | ✅ |

## When to pick which

- **Markdown** - you need maximum reach and only basic formatting; ambiguity and plugin-juggling are acceptable.
- **Djot** - you want Markdown's spirit with a clean, consistent grammar, and a single implementation is fine.
- **MDX** - your docs *are* an app; you want to embed live React/JS components and accept that content runs code.
- **Carve** - you write **cross-referenced, content-rich docs** (handbooks, specs, knowledge bases) and want batteries-included syntax, predictable output, and the same result across php / js / rs - without a build step that executes JavaScript.

::: info Want the full reasoning?
See [Technical Rationale](/technical-rationale) for the parser contract and
[Divergence from Djot](/divergence-from-djot) for the specific design calls
(case-preserving heading ids, content-required list markers, the `+` continuation marker).
:::
