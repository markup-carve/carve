# Carve vs Markdown, Djot & MDX

How Carve compares to the markup languages you already know. The short version:
Markdown's reach, Djot's consistency, web-native features by default - without
turning your content into a JavaScript program.

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
\*\* Like Markdown for bullets, quotes, headings, tables and closed fences;
ordered-list markers deliberately never interrupt (no CommonMark `1.`-only
heuristic).

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
| Automatic heading ids | ⚠️ tooling | ✅ | 🧩 | ✅ lowercase, GitHub-style |
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
(lowercase heading ids, content-required list markers, the `+` continuation marker).
:::
