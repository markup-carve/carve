# Carve

A lightweight markup language with visual mnemonics and human-centered design.

> "The best markup is the one you don't have to think about."

## Philosophy

Carve builds on Markdown's basics and Djot's technical rigor while adding:

- **Visual mnemonics** - Syntax resembles its output
- **Human factors research** - Based on how non-technical users naturally mark up text
- **Progressive disclosure** - Basic usage is trivial, power features exist when needed
- **Extendable by design** - Core syntax stays small while standard and app-level extensions fit a defined contract
- **Social conventions** - `@mentions` and `#tags` are recognized as first-class inline tokens

## Why Carve?

Markdown's reach, Djot's consistency, web-native features by default - without
turning your content into a JavaScript program. What sets Carve apart:

- **Cross-references that just work** - `</#id>` auto-fills its link text from the
  target heading, and `[[Heading]]` resolves to a heading with no separate
  definition. Neither Markdown nor Djot offers this natively.
- **GitHub-style heading ids by default** - lowercase, Unicode-preserving anchors
  that make ids and cross-references case-insensitive with zero configuration.
  ASCII-folding is available opt-in for share-safe URL fragments.
- **Batteries in core, not plugin soup** - math, footnotes, admonitions,
  definition lists, frontmatter, smart typography, editorial markup, and tables
  with rowspan/colspan/captions are all part of one spec - not a dozen plugins
  to discover, install, and keep in sync.
- **Opinionated, author-safe defaults** - a stray `-` never becomes a list (a
  marker requires content), there is no invisible/whitespace-significant syntax,
  and visual mnemonics mean the syntax looks like its output.
- **Predictable output across implementations** - php, js, and rust impls are
  tested against one shared spec corpus, so the same input produces the same
  output everywhere. Markdown has many divergent parsers; Djot has essentially one.
- **Safe with untrusted input** - raw HTML is off by default and a safe mode is
  built in. Carve never executes embedded code (unlike MDX).

### Extension system, built for many targets

Carve's core syntax stays small; everything else is an extension behind a defined
contract. Crucially, **rendering is target-aware** - the same parsed document can
be emitted to different endpoints by swapping the renderer:

- **HTML** for the web (the default),
- **ANSI** for terminal / CLI output,
- **Markdown** for interop and round-tripping,
- **plain text** for search indexes, previews, and notifications.

Extensions hook into this pipeline per target, so an extension can render rich
HTML for the web while degrading cleanly to plain text elsewhere - one source,
many endpoints. See the [Extensions Contract](https://markup-carve.github.io/carve/extensions)
and the [Carve vs Markdown, Djot & MDX comparison](https://markup-carve.github.io/carve/comparison).

## Demo

- [Interactive Playground](https://markup-carve.github.io/carve/playground) - Type Carve, see the rendered HTML live in your browser
- [Examples](https://markup-carve.github.io/carve/examples) - Side-by-side Carve source and output

## Quick Reference

````
EMPHASIS
  /italic/  *bold*  /*bold italic*/
  _underline_  ~strikethrough~
  ^super^  ,,sub,,  ==highlight==

HEADINGS
  # H1  ## H2  ### H3  #### H4

LINKS & IMAGES
  [link text](https://url.com)
  [Page Name][]              (wiki-style)
  ![alt text](image.jpg)

CAPTIONS (images, quotes, tables)
  ![Photo](img.jpg)
  ^ Figure 1: Caption text

LISTS
  - unordered item            (bullets: - or *; + is NOT a bullet)
  1. ordered item
  - [ ] task
  - [x] done
  - step                       (+ on its own line = list-continuation
  +                             marker: attaches the next flush-left
  > note                        block to the item, keeping it tight)

CODE
  `inline code`
  ```language
  code block
  ```

QUOTES & ADMONITIONS
  > quoted text
  ^ Attribution

  ::: note
  admonition content
  :::

TABLES
  |= Header |= Header |      (|= for headers)
  | Cell    | Cell    |
  ^ Table caption

  | ^       | ...     |      (^ rowspan)
  | ...     | <       |      (< colspan)
  + continuation      |      (+ multiline)

ABBREVIATIONS
  *[HTML]: HyperText Markup Language

ATTRIBUTES
  {#id .class key=value}

EXTENSIONS
  :youtube[VIDEO_ID]
  @username  #tagname

COMMENTS
  %% whole-line comment
  text %% trailing comment
  %%%
  block comment
  %%%
````

## Design Principles

Carve inherits and extends Djot's rationale:

### From Djot

1. **Linear parsing** - Parse in linear time with no backtracking. Inline
   emphasis is resolved with a delimiter stack in a single left-to-right pass;
   document-level definitions (link/footnote/abbreviation references, heading
   IDs) are collected in a first pass before inline resolution. Both are O(n);
   neither requires backtracking.
2. **Local inline parsing** - Inline *tokenization and syntax highlighting*
   never depend on later content. Semantic *expansion* that does need the
   definition table (abbreviation `<abbr>`, `</#id>` auto-text, `[text][ref]`
   targets) runs after the first-pass collection above — a definition that
   appears later in document order is still resolved. This is the defined
   two-pass model, not backtracking.
3. **Simple emphasis** - Single characters, no complex disambiguation rules
4. **No expressive blind spots** - All outputs achievable without workarounds
5. **Simple list indentation** - Indented content belongs to the list item
6. **Reduced parser complexity** - No HTML recognition, entity parsing, or case-folding
7. **Markdown-like interruption** - A block opener on a new line starts a block, no blank line required (§10)
8. **Uniform composition** - Content meaning consistent inside/outside containers
9. **Arbitrary attributes** - `{#id .class key=value}` on any element
10. **Generic containers** - Fenced divs (`:::`) for extensibility
11. **Syntax simplicity** - One way to do things, no redundant syntax

### Carve Additions

12. **Visual mnemonics** - Syntax characters suggest their output:
    - `/italic/` - slashes lean like italic text
    - `*bold*` - asterisks are heavy/bold
    - `_underline_` - underscore is literally underneath
    - `~strikethrough~` - tilde resembles a line through text
    - `^super^` - caret points up
    - `,,sub,,` - commas pull down

13. **Five-Second Rule** - Syntax should be:
    - Learnable in 5 seconds for basic use
    - Memorable after 5 days without use
    - Unambiguous within 5 characters of context

14. **No invisible syntax** - No trailing spaces, no significant whitespace tricks

15. **Simpler tables** - `|=` marks headers (from Creole), no separator row required

16. **Table spanning** - `^` for rowspan, `<` for colspan, `+` for multi-line cells

17. **Captions** - `^` prefix adds captions to images, blockquotes, and tables

18. **Abbreviations** - `*[ABBR]: expansion` for automatic `<abbr>` tags

19. **Social integration** - `@mentions` and `#tags` are built into the syntax

20. **Extension system** - `:type[content]{attrs}` for custom inline elements

## Comparison with Markdown and Djot

> **"Markdown" here** = CommonMark plus widely-supported GitHub-Flavored Markdown
> (GFM). `n/a` means there is no standard Markdown syntax for the feature; some
> flavors or Pandoc may add one.

### Inline emphasis

| Feature | Markdown | Djot | Carve |
|---------|----------|------|------|
| Italic | `*text*` / `_text_` | `_text_` | `/text/` |
| Bold | `**text**` | `*text*` | `*text*` |
| Bold italic | `***text***` | `_*text*_` | `/*text*/` |
| Underline | n/a | `{+text+}` (→ `<ins>`) | `_text_` |
| Strikethrough | `~~text~~` (GFM, → `<del>`) | `{-text-}` (→ `<del>`) | `~text~` (→ `<s>`) |
| Highlight | n/a | `{=text=}` | `==text==` |
| Superscript | n/a | `^text^` | `^text^` |
| Subscript | n/a | `~text~` | `,,text,,` |

> **Heads-up for Djot users:** `~text~` is *subscript* in Djot but
> *strikethrough* in Carve, and Carve writes subscript as `,,text,,`. This is
> the one inline delimiter whose meaning flips between the two languages.

### Links & references

| Feature | Markdown | Djot | Carve |
|---------|----------|------|------|
| Links | `[text](url)` | `[text](url)` | `[text](url)` |
| Wiki-style links | n/a (no auto wiki links) | `[Page Name][]` (reference link; needs a `[Page Name]: url` definition) | `[Page Name][]` (auto-resolves, no definition) |
| Cross-references | n/a (manual `[](#id)`) | N/A (manual `[](#id)`) | `</#id>` (auto-fills link text from the target heading) |
| Heading IDs | n/a (auto only on some renderers, e.g. GitHub) | Auto-generated (Unicode, case-preserving) | Auto-generated (lowercase, Unicode-preserving, CSS-selector-safe; opt-in ASCII fold) |
| Heading structure | n/a (flat `<h1>`–`<h6>`, no wrappers) | `<section id="…"><h*>…</h*></section>` with level-aware nesting | `<section id="…"><h*>…</h*></section>` with level-aware nesting (matches djot — id on `<section>`, not on `<h*>`) |

### Lists & tables

| Feature | Markdown | Djot | Carve |
|---------|----------|------|------|
| Definition lists | n/a | `: term` + indented def | `:: term` / `:  def` |
| Ordered list dialects | `1.` / `1)` (decimal only) | decimal/alpha/roman; `.` `)` `(1)` delimiters | decimal/alpha/roman; `.` `)` delimiters (`(1)` deliberately omitted — prose-ambiguity) |
| Table headers | `\|---\|` separator (GFM) | `\|---\|` separator | `\|=` prefix |
| Table alignment | `:--` / `--:` (GFM) | `:--` / `--:` separator | `\|=<` / `\|=>` / `\|=~` (column), `\|<` / `\|>` / `\|~` (cell) |
| Headerless tables | n/a (header + separator required) | N/A (header + separator required) | omit `\|=` |
| Table rowspan | n/a (raw HTML only) | N/A (raw HTML only) | `^` marker |
| Table colspan | n/a (raw HTML only) | N/A (raw HTML only) | `<` marker |
| Multi-line cells | n/a (raw HTML only) | N/A (raw HTML only) | `+` continuation |
| Captions | n/a | Tables only (`^ caption`) | `^ caption` (images, quotes, tables) |

### Blocks & structure

| Feature | Markdown | Djot | Carve |
|---------|----------|------|------|
| Footnotes | `[^ref]` + `[^ref]: def` (GitHub / Pandoc ext) | `[^ref]` + `[^ref]: def` | `[^ref]` + `[^ref]: def` (inline/sidenote deferred) |
| Math | `$…$` / `$$…$$` (GitHub) | `` $`…` `` / `` $$`…` `` | `` $`…` `` / `` $$`…` `` (djot form) |
| Generic divs | n/a | `:::` (→ `<div>`) | bare `:::` / `::: {…}` → plain `<div>`; `::: word` two-tier (canonical → `<aside>`, custom → `<div class=word>`) |
| Inline spans | n/a | `[text]{.c}` (→ `<span>`) | `[text]{.c}` (→ `<span>`) |
| Editorial markup | n/a | `{+ +}` `{- -}` `{= =}` | `{+ +}` `{- -}` `{~ ~> ~}` `{= =}` `{# #}` |
| Comments | `<!-- … -->` (HTML) | `{% … %}` | `%%` line / `text %% trailing` / `%%%` block |
| Raw / passthrough | inline / block HTML | inline `` `…`{=html} `` + ` ```=html ` block | inline `` `…`{=html} `` + ` ```raw html ` block |
| Includes | n/a | N/A | `{{ path/to/file }}` |
| Abbreviations | n/a (PHP-Markdown ext: `*[ABBR]: ...`) | N/A | `*[ABBR]: ...` |
| Attributes | n/a | `{.class}` | `{.class}` |

### Social & extensibility

| Feature | Markdown | Djot | Carve |
|---------|----------|------|------|
| Extensions | n/a | Fenced divs | `:type[content]{attrs}` |
| Mentions | n/a (auto-linked on GitHub only) | N/A | `@user` |
| Tags | n/a | N/A | `#tag` |

### Mention and tag rendering

Carve parses `@user` and `#tag` into dedicated AST nodes. The default HTML
renderer does **not** invent destination URLs. Without renderer config, they
render as non-link spans:

```html
<span class="mention"><strong>@alice</strong></span>
<span class="tag"><strong>#release</strong></span>
```

If your application has real routes, provide URL templates at render time:

```ts
carveToHtml(source, {
  mentionUrl: 'https://github.com/{user}',
  tagUrl: '/topics/{name}',
})
```

Suggested CSS:

```css
.mention,
.tag {
  font: inherit;
}

.mention strong,
.tag strong {
  font-weight: 600;
}

a.mention,
a.tag {
  font-weight: 600;
  text-decoration-thickness: 0.08em;
  text-underline-offset: 0.14em;
}
```

Guidelines:

- Keep the default non-link styling close to body text; mentions and tags are identifiers, not calls to action.
- Reserve stronger color and hover treatment for real links so users can tell whether interaction is available.
- Target `.mention` and `.tag` in shared rules so switching from `<span>` to `<a>` does not require a CSS rewrite.

> **Djot accuracy notes:** Djot defines captions for pipe **tables only** (a
> `^ ` line after the table); Carve extends the same `^` prefix to images and
> block quotes. Djot has **no abbreviation syntax** — the nearest workaround is
> a titled generic span (`[ABBR]{title="..."}`), which only yields a tooltip,
> not managed `<abbr>` expansion.

## Key Differences from Markdown

- Single `*` for bold (not `**`)
- `/italic/` visual mnemonic (not `*` or `_`)
- `|=` table headers (no separator rows needed)
- `^` captions for images, quotes, tables
- `^` rowspan, `<` colspan, `+` multi-line in tables
- Built-in abbreviations with `*[ABBR]: ...`
- Unambiguous parsing rules
- Built-in extension system

## Status

Carve is a design exploration. The specification lives across [`docs/case-study/`](docs/case-study/). The site renders at <https://markup-carve.github.io/carve/>.

**File extension:** `.crv`

Maintaining the spec ↔ carve-js ↔ carve-php lockstep, and the list of known cross-implementation divergences, are documented in [`MAINTAINING.md`](MAINTAINING.md).

## Influences

- **Djot** (John MacFarlane) - Rigorous parsing, attributes, foundation
- **Org-mode** - `/italic/` syntax, TODO states
- **Creole** - `|=` table headers
- **AsciiDoc** - Admonitions, document structure
- **CriticMarkup** - Editorial annotations
