---
description: Every place Carve deliberately parses differently from Djot - the reference for porting a Djot parser.
---

# Divergence from Djot

::: info Who this is for
**Implementers porting a Djot parser**, and authors coming from Djot who hit a surprise. This is the exhaustive list of deliberate parse differences - not an introduction to Carve.
:::

Carve starts from [Djot](https://djot.net) - John MacFarlane's predictable,
backtracking-free reimagining of Markdown - and keeps almost all of it: the
linear parse model, generic containers, arbitrary attributes, footnotes, math,
and smart typography all carry over - the last of those with the same rules but
a smaller AST shape (see section 12 below). Definition lists are one of the
deliberate breaks (see section 9 below).

So why diverge at all? Because a handful of Djot's choices optimize for
"Markdown-compatible" over "unambiguous to author and read." Carve is willing to
break source-compatibility in a few specific places to remove footguns and make
the common case correct by default. This page lists every deliberate break and
the reasoning behind it.

::: tip
For the parser-level rationale (why no backtracking, two-pass resolution, etc.)
see [Technical Rationale](/technical-rationale). For the feature matrix against
Markdown and MDX too, see [Carve vs Markdown, Djot & MDX](/comparison).
:::

## 1. Case-preserving heading ids with case-insensitive cross-references

**Djot:** heading ids preserve case and non-ASCII, with no Unicode
normalization (`# Getting Started` → `Getting-Started`). Cross-references are
not a core Djot feature.

**Carve:** the default id is the same shape - **case-preserving, no Unicode
normalization, non-ASCII kept verbatim** (`# Getting Started` →
`Getting-Started`, `# Über uns` → `Über-uns`). This is deliberately aligned
with Djot and is fully portable: the slug is a pure ASCII run-replacement over
the raw code points, with no case-folding or normalization tables, so every
implementation (php, js, rust) produces a byte-identical id.

Where Carve goes further is **resolution**: `</#id>` and `[Heading][]`
cross-references match their target **case-insensitively** and link to the
target's actual (case-preserved) id. So a lowercase reference still resolves
even though the emitted id keeps its original case:

```
# My API Reference        →  id="My-API-Reference"
See </#my-api-reference>  →  resolves to href="#My-API-Reference",
                              link text cloned from the heading
```

**Why.** Case-preserving ids need no Unicode case-folding in the slug, so the
algorithm stays zero-dependency and byte-identical across implementations (a
whole-string lowercase would even diverge on Greek final-sigma). Folding at
*resolution* time keeps the emitted id Djot-shaped while still letting authors
write references in whatever case they like.

**Opt-in transforms.** GitHub/SSG-style lowercase anchors and share-safe
ASCII fragments remain available as opt-in, orthogonal options
(`lowercaseHeadingIds`, `asciiHeadingIds` in carve-js; the
`LowercaseHeadingIdsExtension` / `AsciiHeadingIdsExtension` in carve-php; the
`lowercase_heading_ids` and `ascii_heading_ids` options in carve-rs):

| `lowercase` | `asciiFold` | `# Über uns` → |
|:-:|:-:|---|
| off | off | `Über-uns` (default) |
| on | off | `über-uns` (GitHub-style) |
| off | on | `Uber-uns` (ascii, case kept) |
| on | on | `uber-uns` (share-safe) |

ASCII-folding has two modes, because the transliteration table covers Latin,
IPA, combining marks, Cyrillic, punctuation and currency - and not Greek, CJK or
Arabic. Best-effort (carve-js `'fold'`, carve-rs `AsciiHeadingIds::Fold`) keeps
what it cannot map, so `Ωmega` stays `Ωmega` and the heading keeps a usable
anchor; strict (carve-js `'strict'`, carve-rs `AsciiHeadingIds::Strict`, and what
carve-php's extension does) drops it, so `Ωmega` becomes `mega` and the id is
guaranteed to match `[0-9A-Za-z-]`. All three engines carry the same table, so a
folded id is byte-identical across them; carve-rs bakes it rather than taking a
dependency.

Smart-typography substitutions are also reversed to their ASCII source before
the id is computed, so an id never depends on presentational typography:
`# Don't repeat yourself` slugs to `Don-t-repeat-yourself` (not a curly `’`),
and `# Step 1 -> done...` to `Step-1-done`. A literally-typed em dash is
likewise normalized; a genuine non-typography symbol such as `•` is kept.

## 1b. Heading-id punctuation model

**Djot:** removes a fixed ASCII blocklist of punctuation, so characters such as
`;` and `:` that are not in the list survive in the id (`# a; b: c` →
`a;-b:-c`).

**Carve:** keeps only ASCII alphanumerics plus every non-ASCII code point, and
replaces every other ASCII run with a single `-` (`# a; b: c` → `a-b-c`,
`# C++ & Rust` → `C-Rust`). An allowlist gives cleaner, more predictable
anchors than enumerating punctuation to drop.

## 1c. Only the id hoists to the `<section>` wrapper

Both languages wrap a top-level heading, and the content following it, in a
`<section>` that carries the heading's id. They disagree about the heading's
*other* attributes.

**Djot:** the resolution recorded in `jgm/djot.js#43` is that all of a heading's
attributes migrate to the section. The implementation applies that only when the
heading carries an explicit `{#id}`; with an auto-generated id the non-id
attributes stay on the heading, so djot's two cases contradict each other and
each other's stated rule (`jgm/djot.js#144`, open).

**Carve:** the id hoists, everything else stays on the `<h*>`, and the two id
cases agree:

```
{a=b .c}      →  <section id="abc"><h1 a="b" class="c">abc</h1></section>
# abc

{a=b .c #x}   →  <section id="x"><h1 a="b" class="c">abc</h1></section>
# abc
```

The id is the one attribute that is about the *region*: it names what a
`#fragment` URL scrolls to, and that is the section. The rest describe the
heading the author attached them to - `{.featured}` marks the heading, and an
author who wants to style the whole subtree writes a div around it. Keeping the
rule independent of how the id was produced also means it survives the wrapper
being switched off: with `sections: false` (PART 9 §13) the id simply returns to
the `<h*>` and nothing else moves, which is already how every heading inside a
blockquote, div, or list item renders in both languages.

## 2. A list marker must have content

**Djot / CommonMark:** a bare `-` (or `- ` with only trailing whitespace) starts
an empty list item.

**Carve:** a marker is a list item **only when followed by a space and non-empty
content**. A content-less `-`, `- `, or `-   ` is ordinary paragraph text.

**Why.** Two footguns disappear:

- A lone dash used as a prose separator or placeholder no longer silently becomes
  a one-item bullet list.
- A trailing space stops being load-bearing. Editors that strip trailing
  whitespace can't change the meaning of `- ` vs `-`.

```
-            →  paragraph text "-"        (not an empty list)
- item       →  a list item
```

## 3. `+` is the continuation marker, not a bullet

**Djot / CommonMark:** `+`, `-`, and `*` are all bullet markers.

**Carve:** bullets are `-` and `*` only. `+` is reserved as the **list
continuation marker** - a lone `+` on its own line attaches the next flush-left
block to the current list item, keeping the list tight instead of breaking it.

**Why.** Freeing `+` makes a lone `+` unambiguous and gives lists a clean way to
own a following block (a note, a quote, a code fence) without deep indentation:

```
- step one
+
  > a note that belongs to step one
- step two
```

A `+ text` line is just paragraph text, so nothing is lost for authors who never
used `+` as a bullet (most don't).

## 4. Visual-mnemonic emphasis

**Djot:** `_emphasis_` (italic), `*strong*` (bold).

**Carve:** the delimiter looks like its effect.

| Effect | Djot | Carve |
|--------|------|-------|
| Italic | `_text_` | `/text/` (slashes lean) |
| Bold | `*text*` | `*text*` (heavy) |
| Bold italic | `_*text*_` | `/*text*/` |
| Underline | (none; `{+text+}` is insert → `<ins>`) | `_text_` (line underneath) |
| Highlight | `{=text=}` | `=text=` |
| Subscript | `~text~` | `{,text,}` (comma pulls down; braced only) |
| Superscript | `^text^` | `{^text^}` (braced only) |

**Why.** Carve targets non-technical authors too. Syntax that resembles its
output is learnable in seconds and memorable after weeks away - the "ten-second
rule." It is a source-compatibility break with Djot, but a small, teachable one.

::: warning One delimiter flips meaning
`~text~` is **subscript** in Djot but **strikethrough** in Carve (the tilde looks
like a line through text). Carve writes subscript as the braced `{,text,}` only.
This is the one inline delimiter whose meaning differs between the two
languages - worth knowing when porting Djot source.
:::

Superscript and subscript have **no bare delimiter** in Carve: `^text^` and
`,text,` are literal text, and only the braced `{^text^}` / `{,text,}` forms
mark. The dominant uses (H₂O, mc²) are intraword — which a word-boundary
delimiter could never express — and a bare comma would collide with prose
punctuation (`typo ,oops, happens` must not become a subscript).

## 5. No parenthesized ordered markers

**Djot:** `(1)`, `(a)`, `(i)` are valid ordered-list markers.

**Carve:** ordered lists use the `.` and `)` delimiters only (`1.` / `1)`).
`(1)` stays literal paragraph text.

**Why.** A leading `(1)` is far more often a prose parenthetical than a list. In
technical writing especially, biasing toward the literal reading avoids
surprise lists.

## 6. Plain-text comments

**Djot:** `{% comment %}`.

**Carve:** `%%` to end of line, `text %% trailing`, a `%%%` fenced block, or the
Djot spelling `{% comment %}` for the delimited case.

**Why.** `%%` is faster to type, reads like a comment in many config formats, and
needs no closing delimiter for the common single-line case. It runs to the end
of its inline run, though, so prose cannot resume after it on the same line -
and for that Carve takes Djot's `{% … %}` unchanged (PART 9 §21a), including
its rules: no nesting, opaque in code spans, an unterminated opener stays
literal. A Djot document's comments therefore keep working as written.

## 7. Block openers interrupt paragraphs (Markdown-like)

**Djot:** an open paragraph runs until a blank line. A line that begins with a
block marker - a `-`/`*` bullet, `>` quote, `#` heading, a `|` table row, or a
fence - stays part of the paragraph; the block needs a blank line before it.

**Carve:** a **visible** block interrupts an open paragraph with no blank line
before it - the Markdown / CommonMark rule. The exception is **list markers**:
neither a bullet (`-`/`*`, task) nor an ordered marker interrupts a paragraph -
a list still needs a blank line before it (matching Djot). Both list-marker
classes behave identically here; fence and `:::` closers and bare images are
also excluded (PART 9 §10).

```
intro
# Heading

Djot:   <p>intro\n# Heading</p>                  (one paragraph)
Carve:  <p>intro</p><h1>Heading</h1>             (paragraph + heading)
```

An attribute line between the prose and the block is where the two differ by
more than block position: Djot consumes it as attributes on the soft break and
the bytes vanish, while Carve ends the paragraph and applies them to the block
below. Section 18 records that separately, because "block position is aligned"
is true of the heading and false of the attribute line above it.

A list marker is the exception - it does NOT interrupt:

```
intro
- item

Carve:  <p>intro\n- item</p>                     (one paragraph; add a blank line to start a list)
```

**Why.** Djot's blank-line rule is hard-wrap-safe, but it surprises authors
coming from Markdown more often than it helps: a heading or quote written
directly under a line of prose silently stayed prose. Carve follows the
near-universal Markdown expectation for those blocks. Lists keep Djot's
blank-line rule on purpose: an ordered marker is common in prose ("see step
2.") and a hard-wrapped line that happens to begin with a bullet should not
silently become a list. Escape a marker (`\# H`, `\- item`) or add a blank line
to control it. This block-interruption rule is one of Carve's larger
block-level breaks from Djot, and part of why the project frames itself as
post-Markdown rather than post-Djot.

## 8. Symbols: same name, stricter shape and boundary

Djot and Carve both parse `:name:` as a **symbol** - a named placeholder
rendered literally by default. Djot leaves mapping to filters; Carve builds
it into processor configuration (the renderer `symbols` map, or an
inline-renderer extension handler), with the same literal fallback.

Carve tightens two things djot leaves loose:

- **Name shape.** Djot (djot.js) matches `:[\w_+-]+:`, so any name including a
  leading `_` parses. Carve requires the first character to be a letter, a
  digit, `+` or `-` (`[a-zA-Z0-9+-][\w+-]*`): the reaction shortcodes `:+1:`
  and `:-1:` parse, but `:_x:` stays literal because `:_x_:` would otherwise
  steal from underline. (The two djot implementations already disagree on the
  shape - djot-php rejects `:+1:` while djot.js accepts it, invisibly, because
  unmapped symbols render literally in both.)
- **Word boundary.** Djot opens a symbol anywhere, so `a:b:c` contains the
  symbol `b` and `10:30:` contains `30` - with a mapping active these
  substitute inside words and times. Carve applies the same leading
  boundary rule as `@mention` / `#tag`: a symbol only opens at the start of
  content or after a non-word character.

Attributes on a symbol (`:rocket:{.big}`) are pinned to render a `<span>`
wrapper in HTML so the attributes have a target.

## 9. Definition lists use explicit markers

Djot definition lists are indentation-scoped: a single-colon term line, a blank
line, then an indented body that can be arbitrarily rich - multiple
blank-separated paragraphs, nested blocks, and so on.

```
: term

  First paragraph of the definition.

  Second paragraph.
```

Carve changes only the term and definition *markers*; djot's loose,
indentation-scoped body carries over unchanged:

- A **term** is a line starting with `:: ` (double colon).
- A **definition** is a line starting with `:  ` (single colon, then two
  spaces).

```
:: color
:: colour
:  The visual property of objects.
:  A pigment or paint.
```

```
<dl>
  <dt>color</dt>
  <dt>colour</dt>
  <dd>The visual property of objects.</dd>
  <dd>A pigment or paint.</dd>
</dl>
```

A definition **continues exactly like a list item**, so a `<dd>` is not limited
to a single block. Both forms work:

- **form A** - a blank line then an indented block folds in. This is *exactly
  djot's* indentation-scoped body, so any djot loose definition body carries
  over.
- **form B** - a lone `+` attaches the following flush-left block with no
  indentation (the same continuation marker lists and block quotes use). This
  is a Carve addition on top of the djot model.

So multi-paragraph definitions are fully supported - the divergence is the
*markers*, not the capability:

```
:: term
:  First paragraph.
+
Second, flush-left paragraph joined with +.
```

The term and definition markers are mutually incompatible: a djot `: term`
line parses as a plain paragraph in Carve, and vice versa. Only the markers are
traded - unambiguous `::` / `:  ` instead of djot's single colon, matching how
Carve treats the double-colon as a term and reserves three colons for a
div/admonition. The loose body itself is *not* traded away: form A is djot's
indentation-scoped body, and `+` (form B) is added on top.

## 10. Raw passthrough is target-routed (and the pandoc boundary)

**Djot and Carve share the raw-passthrough syntax:** `` `content`{=format} `` inline
and a ```` ```=format ```` block emit `content` verbatim, but **only** to the renderer
whose output target is `format`. Every other renderer drops the span. This is the
same `RawInline`/`RawBlock` model pandoc-flavored Markdown has used for years
(`` `\alpha`{=latex} ``), and Djot inherits it to feed **pandoc** - which is where
`{=latex}`, `{=typst}`, `{=docx}`, etc. actually render, since the Djot reference
library itself writes only HTML.

**Where Carve differs: it has no pandoc-style multi-writer.** Carve ships HTML,
Markdown, ANSI, and plain-text renderers, and **only the HTML renderer owns a
format** (`html`). So today every non-`html` raw span is inert in Carve's own
renderers - it survives in the AST (`raw-inline` / `raw-block` node, tagged with
its `format`) for a custom AST consumer or a future native writer, but no built-in
renderer emits it.

| raw span | Carve HTML | Carve MD / ANSI / plain |
|----------|-----------|-------------------------|
| `` `x`{=html} `` | emitted verbatim | escaped to text (MD) / dropped |
| `` `x`{=latex} ``, `` `x`{=typst} ``, `` `x`{=markdown} `` | dropped | dropped |

**The raw construct itself is pandoc-compatible.** Pandoc's Djot reader parses
Carve's `` `x`{=format} `` byte-identically and routes it correctly per writer:

| pandoc: djot → | survives | drops |
|----------------|----------|-------|
| `html` | `{=html}` | latex, typst, markdown |
| `latex` | `{=latex}` | html, typst, markdown |
| `typst` | `{=typst}` | html, latex, markdown |

::: warning Do not pipe a whole Carve document through pandoc
Only the raw-passthrough construct is byte-shared. A full Carve document is **not**
valid Djot: pandoc's Djot reader reads `/italic/` as literal text and remaps
`_underline_` to `<em>` (Djot emphasis). Carve's visual-mnemonic emphasis
(section 4) is the break. Use pandoc for the raw spans' sake only if you first
convert the surrounding document, not by feeding Carve source to `-f djot`.
:::

**Why document this.** A `` `x`{=latex} `` that silently renders nothing in Carve
looks like a bug. It is not - it is a hatch for an external writer that Carve does
not yet bundle. The one live, escape-free target in Carve is `html`.

**Closing the gap: pandoc-carve.** The
[pandoc-carve](https://github.com/markup-carve/pandoc-carve) bridge converts the
Carve AST to Pandoc's JSON AST, so one Carve document reaches every pandoc
writer - LaTeX, Typst, DOCX, PDF, and beyond - with the emphasis mapping done
correctly and raw spans target-routed by pandoc itself:

```bash
pandoc-carve doc.crv -t latex -o doc.tex
pandoc-carve doc.crv -t typst -o doc.typ
```

With the bridge in play, `{=latex}` and friends are no longer inert: they are
authored for the pandoc writer that will eventually consume the document.

## 11. List continuation has Carve's minimum content column

**Djot:** a block indented anywhere past a list marker belongs to the item -
even a single space under a `-`, or two spaces under `1. ` (whose content
starts at column 3).

**Carve:** a block belongs to a list item only if it reaches at least the item's
**content column** - the column where the item's own text starts (`- ` -> 2,
`1. ` -> 3, `10. ` -> 4). This is the same rule with or without a blank line
before the block; the blank only decides whether the item is tight or loose.

```
1. one

   > this reaches column 3 - it nests in the item

1. two

  > this stops at column 2 - it detaches to document level
```

**Difference.** Like Djot, Carve accepts a recognized opener at any deeper
indent and treats its authored column as that block's temporary base. Unlike
Djot, Carve still requires the line to reach its canonical content column: a
block one space under `-` is below column 2 and does not nest. Top-level
openers remain column-strict. The `+` continuation marker (§3) still attaches a
flush-left block regardless.

## 12. Smart punctuation is one leaf node, not three container types

Both languages agree on the important half: a typographic substitution has to be
*represented* in the AST, or the formatter cannot reproduce what the author
typed. The substitution rules are also the same - unconditional, per-character
quote direction from the preceding character, `\"` for a literal. The divergence
is the shape of the representation.

**Djot:** three types. `double_quoted` and `single_quoted` are *containers* that
wrap the quoted content, and `smart_punctuation` is a leaf retaining the source
text for dashes and ellipses.

**Carve:** one type. `smart_punctuation` is always a leaf, carrying the resolved
`kind` (`ellipsis`, `em_dash`, `left_double_quote`, …) and the author's source
run (`...`, `--`, `"`). A quote node additionally carries its resolved glyph,
because the glyph is locale-dependent and is decided during parsing. A dash run
becomes one node per resolved glyph, each holding the hyphens it came from, so
`----` round-trips to exactly four hyphens.

Renderers split on which half they read: HTML, Markdown, plain text and ANSI
emit the glyph; the canonical Carve writer emits the source run. That is what
makes `carve fmt` non-destructive - formatting `He said "hello"` writes back
`He said "hello"`, not the curly form.

**Why one leaf instead of two containers.** A container type says the quotes
have *scope*, and in Carve they do not. Quote direction is decided per character
from what precedes it, so an unpaired quote is completely ordinary and `a"b` is
just a right quote mid-word - there is no span to wrap. Making quotes containers
would force every walker to handle a node whose children are the quoted prose,
turn a link label containing a quote into a nested container rather than a
string, and raise the question of what an unmatched opener contains. A leaf
carrying both halves buys the same round-trip with none of that.

For [profiles](/profiles) the node is classified as `text`: it is visible prose
with no capability of its own, so it is not separately nameable.

### Turning it off

The transform runs with no extension registered. A smart-quotes / locale
extension picks *which* glyphs are emitted, not *whether* the substitution
happens - removing it does not turn the transform off.

Hosts may offer one document-global switch, `smartTypography` (default `true`).
With the node representation above, turning it off is a rendering decision
rather than a parsing one: the nodes are still produced, and the presentation
renderers emit each node's source run instead of its glyph, exactly as the
canonical writer already does. The AST does not depend on the switch; the output
is the author's ASCII across the whole converted set - dashes, ellipsis, quotes,
arrows, comparisons, `(c)` `(r)` `(tm)` `+-`:

::: code-group

```js [carve-js]
carveToHtml(source, { smartTypography: false })
```

```php [carve-php]
$renderer = (new HtmlRenderer())->setSmartTypography(SmartTypographyMode::Source);
$converter = CarveConverter::create(renderer: $renderer);
```

```rust [carve-rs]
let options = Options { smart_typography: SmartTypographyMode::Source, ..Options::default() };
```

:::

**Implementation status.** All three engines honor the switch on every
presentation target, each with its own spelling - it is host API, not syntax, so
the spelling is the engine's to choose:

| | carve-js | carve-php | carve-rs |
|---|---|---|---|
| HTML | `carveToHtml(src, { smartTypography: false })` | `(new HtmlRenderer())->setSmartTypography(SmartTypographyMode::Source)` | `Options { smart_typography: SmartTypographyMode::Source, .. }` |
| Markdown | `carveToMarkdown(src, { smartTypography: 'source' })` | `(new MarkdownRenderer())->setSmartTypography(...)` | same `Options` field |
| Plain text | `carveToPlainText(src, { smartTypography: 'source' })` | `(new PlainTextRenderer())->setSmartTypography(...)` | same `Options` field |
| ANSI | `carveToAnsi(src, { smartTypography: 'source' })` | `(new AnsiRenderer())->setSmartTypography(...)` | same `Options` field |

Both also expose it on the command line, where machine-facing output is most
often produced: `carve --html --smart-typography source` in carve-php and
carve-rs. An unknown mode is rejected rather than ignored.

Two spellings this page used to show do not exist: carve-php has no
`CarveConverter::create(smartTypography: ...)` named parameter (the mode is set
on the renderer), and carve-rs has no `with_smart_typography` builder (the field
is set on `Options`). The code group above shows the real ones.

Plain text and ANSI used to emit the glyph whatever the switch said, in all
three engines - accepted and ignored, which is worse than unimplemented. That
gap is closed ([carve#560][st-issue]).

One thing worth stating about the ANSI target, because it is the kind of
arithmetic that looks like it must change and does not: the heading rule is a
COLUMN count of the RENDERED heading, so it does not move with the mode. `The
renderer's output` is 21 columns whether the apostrophe is typed as `'` or
curled to `’` - each is one character - and the rule under it is 21 either way.

This section's claim is measured rather than asserted. Four optional corpus
cases pin it, one per target, and all four are rendered by all three engines
through the comparison harness: `29-smart-typography-off` (HTML),
`31-markdown-typography-source`, `34-plain-typography-source` and
`35-ansi-typography-source`. A regression fails there instead of leaving this
paragraph quietly wrong - which is the state it was in for as long as it named
three calls that no longer matched any engine.

[st-issue]: https://github.com/markup-carve/carve/issues/560

The switch is document-global on purpose. Defaulting it per target - on for
HTML, off for Markdown and plain text - was considered and rejected: one source
must carry the same text on every target, and a target-dependent default would
let `to_html(x)` and `to_markdown(x)` disagree about what the document says.

Turning it off is for **machine-facing** output: a corpus rendered to Markdown
or plain text for a model to read, generated documentation that has to stay
diff-stable, or anything re-parsed downstream, where a curly quote is a
character the consumer did not ask for and cannot reverse. For output aimed at
human readers - which is the default case - leave it on.

The switch changes nothing else. Escapes still work (`\"` yields a straight
quote either way) and `:name:` symbols are untouched. Heading ids are
byte-identical in both modes: the id pass normalizes typographic output back to
ASCII before slugging (section 1 above), so `# Don't repeat yourself` gives
`Don-t-repeat-yourself` whether the heading
renders with a curly apostrophe or a straight one.

## 13. A colon fence closes on an exact length match

Both languages spell a container `:::`, close it with a bare colon fence, nest
equal-length fences, and close a container that never got a closer at the end
of the input. Carve used to differ on the last two of those and no longer does.
What remains is the closer rule itself, and it pulls three smaller differences
along with it.

**Djot: a closer is at least as long as its opener. Carve: exactly as long.**
Djot's rule is the code fence's rule, borrowed. Carve treats the length as a
depth count instead, so a fence that does not match the innermost open
container is not a closer at all - it is an opener.

**A bare closer closes one container.** Djot's closes every container open
above it in one go:

```
::: a
::: b
X
:::
after
```

Djot ends both `a` and `b` at the single `:::`, leaving `after` outside. Carve
closes only `b`; `a` is still open, so `after` belongs to it, and `a` ends at
the end of the input.

**A fence shorter than the innermost container.** Under `:::: a`, a bare `:::`
is content in djot and the div runs to the end of the input. In Carve it
matches nothing, so it opens a child container.

**Widening inward works in Carve and not in djot.** `:::` holding a `::::` is
garbage in djot, where the wider line closes the outer container. In Carve it
nests, and it is the direction `carve fmt` emits: the outermost container is
`:::` and each level inward adds a colon. Djot documents cannot use that form,
but they never contain it either, so djot source keeps parsing unchanged.

**One unrelated strictness.** Djot accepts `:::note` with no space before the
type word; Carve requires the space and treats the glued form as a paragraph.
Carve's grammar always said so - the engines were laxer than the spec, and the
old closer lookahead hid it.

**Why.** Fence length in Carve means depth, and it means depth so that a
canonical writer can size a fence from the tree in front of it. Under
equal-or-greater, a container's fence had to outrank every container anywhere
in its subtree, so a writer had to know its own maximum depth before it could
emit its opening line - and every implementation got that wrong in the same
way, sizing the fence from one level of lookahead and silently unnesting the
middle container of a three-level document. Exact matching removes the class:
width is local depth, computable on the way down.

**What the writer pays for it.** The width is a function of depth, so canonical
output spends `d^2 + 5d` bytes of fence marker on a nest `d` containers deep -
`sum(3..d+2)` colons on the openers and the same again on the closers - while
the content inside it grows linearly. At three levels, the depth real documents
use, that is 24 bytes and nobody notices. At the parse cap it dominates the
document: `182-openers-past-the-nesting-cap-are-one-paragraph` is 2,032 source
bytes and 42,435 bytes of canonical form, a **21x expansion**, of which 41,012
bytes - 96.6% of the output - are colons, with the widest fence 202 colons wide
at `MAX_NESTING_DEPTH = 200`. (Measured over the corpus of 1367 documents at
spec `f6af10f9`, against that document's `.crv` source and its `.fmt` sidecar.)

That document exists to sit *at* the cap and is adversarial by construction -
203 openers and one word of content - so read the 21x as this rule's worst case
rather than its typical one. It is the price of the paragraph above: a writer
that instead chose the narrowest fence its content does not collide with would
have to scan every subtree before writing its opener, which is the lookahead
exact matching was adopted to remove. The trade was re-examined and kept
(markup-carve/carve#1553); the normative statement of it is PART 9 §12.

## 14. Headings are single-line

**Djot:** a heading's text spills onto following lines until a blank line. A
following plain line folds in, and so does a line carrying the same number of
`#`.

**Carve:** a heading ends at the newline. Nothing folds into it.

```carve
# Title
Some text.
```

| | Djot | Carve |
|---|---|---|
| result | one `<h1>` holding both lines | `<h1>Title</h1>` then `<p>Some text.</p>` |
| id | `Title-Some-text` | `Title` |

**Why.** This is the same argument as section 7, applied to the other ordering.
Section 7 already broke from Djot's blank-line rule because a heading written
directly under prose silently stayed prose - it surprises authors arriving from
Markdown more often than it helps. The mirror case, prose written directly under
a heading, was left folding: same two lines, order swapped, opposite doctrines.
`docs/parsing-ambiguities.md` called it "the biggest authoring trap in the heading
syntax", and a documented trap is still a trap. Now both orderings answer the
same way.

It also makes one model true across the language. The grammar describes a
heading as "a bounded title, not an open paragraph" while giving it
paragraph-style spill. Lazy continuation now means exactly one thing: it
continues an **open paragraph**. A heading is not a paragraph.

**Cost.** Source-wrapping a long heading is gone. Headings are short by
construction, Markdown never offered it, and the rendered result was a raw
newline inside the `h1`. A Djot document that wraps a heading renders
differently in Carve, which is what `carve lint --from-djot` reports.

Pinned in the corpus as `82-single-line-headings*` - the five cases that used to
pin the folding rules, kept as the regression guard for what replaced them.

## 15. Block markers are column-strict and their separator is a literal space

**Djot:** a block marker tolerates leading indentation and accepts any
whitespace as its separator, so ` # H` is a heading and `>\tq` is a quote.

**Carve:** a top-level block opener must start at column 0, and a marker's
separator is a literal space that a tab does not satisfy (PART 9 §24 C1 gives a
tab a column value; the separator rule is about the byte, not the column).

```
 # H            Djot:  <section id="H"><h1>H</h1></section>
                Carve: <p># H</p>

>\tq            Djot:  <blockquote><p>q</p></blockquote>
                Carve: <p>&gt;\tq</p>
```

**Why.** Both spellings are invisible in a diff and in most editors, so a
document that renders one way for the author renders another way after a
reformat. Requiring the column and the byte makes the shape of the source
decide, not the width of a tab stop. This is a SOURCE break: the bytes mean
something different, and nothing is silently dropped.

## 16. Attribute names are strict

**Djot:** an attribute value is largely unconstrained, so `{.123}` is a class
named `123`.

**Carve:** explicit classes and ids accept the same ASCII digit-leading values.
Attribute keys, boolean names and inline-extension names still have to begin
with an ASCII letter or underscore. A block that fails those shapes stays
literal text.

```
[x]{12=v}       Djot:  <p><span 12="v">x</span></p>
                Carve: <p>[x]{12=v}</p>
```

**Why.** HTML permits digit-leading class and id values, so Carve preserves
them. It does not widen the grammar for attribute or extension names, where a
digit-leading token is more likely to be a typo. Generated heading ids remain
conservative: a digit-leading slug still receives the `s-` prefix.

## 17. A list marker takes attributes

**Djot:** `-{.c} x` is a paragraph: the `-` is text carrying a span, because a
bullet needs its separator before anything else.

**Carve:** the attribute block binds to the MARKER and the line is a list item.
It is item metadata, not marker width: continuations use the bare marker's
content column (`- ` -> 2, `1. ` -> 3) regardless of the attribute spelling.

```
-{.c} x         Djot:  <p><span class="c">-</span> x</p>
                Carve: <ul><li class="c">x</li></ul>
```

**Why.** Attributing the item is the thing authors want, and Djot's reading
turns a would-be list into prose with a stray bullet in it. An EXTENSION that is
also a source break, since the same bytes parse to different block structure.

## 18. An attribute line in inline position is preserved, not consumed

**Djot:** a `{...}` line inside an open paragraph is consumed as attributes on
the soft break. Those bytes leave no trace in the output.

**Carve:** the paragraph ends at the block opener below (section 7), and the
attribute line applies to the block that follows.

```
intro
{.c}
# H

Djot:   <p>intro # H</p>                       ({.c} is gone; the heading is text)
Carve:  <p>intro</p><h1 class="c">H</h1>       (the attributes land on the heading)
```

**Why.** Silently discarding authored bytes is the failure mode hardest to
notice, because the output is well-formed and merely missing something. This is
an AST break as much as a source one: Djot's tree has no node carrying those
attributes at all.

## 19. An attached sub-block leaves the item tight

**Djot:** a blank line inside an item makes the item loose, so its lead becomes
a `<p>`, whatever follows the blank.

**Carve:** a sub-block attached after a blank keeps the item tight - the lead
stays bare. §17 L2.

```
- a

  > q

Djot:   <li><p>a</p><blockquote><p>q</p></blockquote></li>
Carve:  <li>a<blockquote><p>q</p></blockquote></li>
```

Measured across the attached kinds: a block quote, a code fence, a colon div, a
heading and a table all diverge this way. **A nested list does not** - Djot keeps
that item tight too, so the two agree there. A plain paragraph after the blank is
loose in both, which is the control.

**Why.** The blank line is how a sub-block is attached at all, so treating it as
a looseness signal makes attachment and spacing the same gesture. An AST break:
the difference is a `<p>` wrapper, not the content.

## 20. A typed container is a native admonition

**Djot:** `::: note` is a div with a class.

**Carve:** a recognized type renders as an `<aside>` carrying the admonition
role, and unrecognized types still render as a div.

```
::: note
body
:::

Djot:   <div class="note"><p>body</p></div>
Carve:  <aside class="admonition note" aria-label="Note"><p>body</p></aside>
```

**Why.** An admonition is a landmark for assistive technology, and `<aside>`
carries that where a `<div>` does not. RENDERER SPECIALIZATION rather than a
source or AST break: the same source produces the same tree shape, and only the
element it renders to differs.

The name comes with the landmark, because an unnamed one is an anonymous row in
a reader's landmark list - the benefit the `<aside>` was chosen for is only
delivered once the region can be told apart from the next one. An admonition
that carries a title is named by that title instead
(`aria-labelledby` pointing at the `<p class="admonition-title">`), so the
visible name and the spoken one are a single string. See PART 9 §12.

## 21. Footnote labels are matched exactly

**Djot:** a footnote label is normalized before lookup, so runs of whitespace
collapse and the ends are trimmed. Every reference below binds to the same
definition.

**Carve:** the label runs to the closing `]` and is matched exactly. Whitespace
is not normalized, the ends are part of the identifier, and a reference may not
contain a newline at all - so only a reference written the way the definition
was written binds.

Definition:

```
[^a b]: foo
```

References, measured against djot.js 0.3.2:

```
[^a b]      Djot: binds    Carve: binds
[^a  b]     Djot: binds    Carve: literal text
[^a<TAB>b]  Djot: binds    Carve: literal text
[^ a b ]    Djot: binds    Carve: literal text
```

A reference may not contain a newline in Carve, so a wrapped one is literal:

```
see[^two
words].

[^two words]: foo
```

renders

```html
<p>see[^two
words].</p>
```

Released Djot agrees on that one: djot.js 0.3.2 also leaves it literal, so this
half is not a divergence today. It is becoming one - jgm/djot.js#146 rules the
two sides asymmetric, letting a reference wrap and folding the newline away in
normalization, and djot-php#269 follows that upstream. Carve's answer stays no:
a definition marker is one line, and without normalization a wrapped reference
would be an identifier no definition can bind.

**Why.** A label is an identifier, and normalization makes two visibly different
identifiers the same key: `[^a b]` and `[^a  b]` are one footnote in Djot,
which is a difference an author can see in their source but not in their
output. Matching the bytes keeps the source the authority, and it is the same
ruling the link-reference labels take.

The cost is real and worth stating: a long label cannot be wrapped. Djot buys
that ability with normalization; Carve does not, and a reference broken across
lines stays literal text rather than binding. `carve portability` reports the
difference on a document that relies on either behavior.

A SOURCE break: the bytes decide, and nothing is silently dropped - an
unmatched reference stays visible as the text the author typed.

## What Carve adds on top (not breaks)

An unterminated `%%%` degrades to a line comment rather than opening an opaque
block, so `%%%` then `x` renders `<p>x</p>` where Djot - which has no comment
syntax - renders both lines as text. That is part of the comment addition
(section 6) rather than a separate design decision.

These aren't divergences - Djot has no equivalent - but they're why Carve exists
as more than restyled Djot:

- **Cross-references** - `</#id>` auto-fills its link text from the target heading.
- **Implicit heading references** - `[Heading][]` resolves to a heading with no
  separate `[label]: url` definition (the wiki-style `[[Heading]]` form is a
  separate opt-in extension, not core syntax).
- **Tables with rowspan / colspan / multi-line cells** and captions on images,
  quotes, and tables.
- **Native admonitions**, editorial/critic markup, `@mentions`, and `#tags`.
- **A fenced block quote** - `::: >` is the block quote written without a marker
  on every line. Same node, same HTML, and `carve fmt` writes back whichever
  spelling the author used. Djot has only the marker form; the proposal for a
  fenced one is jgm/djot#401, still open there. It nests at CONSTANT width,
  which Carve's exact-length closer allows and Djot's greedy one does not: in
  Djot each wrap would need a fence one colon wider than the one it wraps.
- **Inline footnotes** - `^[content]` carries a note in place (pandoc-style),
  numbered into the same endnotes as a reference `[^label]`. Canonical djot has
  only reference footnotes; `^[…]` is a carve addition (grammar §16).
- **Bare-dot ordered markers** - `. item` is a decimal ordered item counting
  from 1, the AsciiDoc-style shorthand for the list nobody numbers by hand. It
  is a spelling of decimal-dot, not a dialect, so it mixes with `1.` in one
  list; only `.` may drop its value, since a leading `) ` collides with prose
  parentheticals far more often (grammar, ordered_marker).
- **Boolean attributes** - a bare word in `{…}` (`[text]{featured}`,
  `{.note open}`) is a value-less attribute rendered `name=""`. Canonical djot
  rejects bare words (the whole block stays literal); carve accepts them,
  following djot-php (grammar §14). The three core semantic names below are
  consumed instead of rendered; four more are consumed where the SemanticSpan
  extension is enabled.
- **Semantic span attributes** - `abbr`, `time` and `kbd` on an ordinary span
  select an HTML element rather than an attribute, so `[Tab]{kbd}` is
  `<kbd>Tab</kbd>`, and leftover attributes ride that element rather than a
  wrapper. `abbr` and `time` values become `title` and `datetime`. Djot has no
  equivalent: there the same span is `<span kbd="">` (PART 9 §9). Four more
  names are available through the SemanticSpan extension.
- **Target-aware rendering** - one parsed document, multiple renderers (HTML,
  ANSI, Markdown, plain text) behind a single extension contract.

## Porting Djot to Carve

Most Djot source needs only mechanical changes:

1. `_italic_` → `/italic/`, and check every `*…*` (Djot strong stays `*…*`).
2. `~sub~` → `{,sub,}` and `^sup^` → `{^sup^}` (braced forms; Carve has no
   bare sub/sup delimiter); if you used `~` for strikethrough-by-convention,
   it's now native.
3. Replace `+` bullets with `-` or `*`.
4. `{% comment %}` keeps working; rewrite to `%%` only where you want the
   comment to run to the end of the line.
5. Heading anchors are case-preserving (Djot-shaped), so hand-written
   `</#Anchor>` links work as written - cross-references resolve
   case-insensitively. For lowercase anchors, enable the opt-in
   `lowercaseHeadingIds` transform.
6. A marker line (`- `, `> `, `# `, a table row, a fence) directly under a line
   of prose now starts a block. Where you relied on Djot keeping it in the
   paragraph, add a blank line or escape the marker.
7. Definition lists: rewrite `: term` (+ indented body) as `:: term` then
   `:  definition`. A multi-paragraph Djot `<dd>` carries over - a Carve
   definition continues like a list item (indent a block after a blank line, or
   use a lone `+`; see section 9).
8. **Attribute blocks that Djot accepted and Carve does not.** A class or id
   starting with a digit (`{.123}`) is no longer an attribute block - it stays
   literal text, so it becomes visible rather than silently styling nothing.
   Rename it (section 16).
9. **An attribute line inside a paragraph.** Djot consumed `{...}` on a soft
   break and dropped the bytes; Carve ends the paragraph at the block below and
   applies them to it. If you relied on the Djot reading, the attributes now
   land on something. This is the one form on this list that silently CHANGED
   meaning rather than becoming an error (section 18).
10. **Indented block openers and tab separators.** ` # H` is prose in Carve and
   `>\tq` is prose too - the opener must start at column 0 and the separator is
   a literal space. Both are invisible in most editors, so search for them
   rather than reading for them (section 15).
11. **`-{.c} x`** is a list item with attributes in Carve and a paragraph in
   Djot. Nothing is lost, but the block structure changes (section 17).
12. Nested containers mostly carry over: equal-length fences nest in both
   languages, and an unclosed container ends at the end of the input in both.
   Two things need attention. A single bare closer that you relied on to close
   several containers at once now closes only the innermost - give each its
   own. And `:::note` needs a space: `::: note`. See section 13.

The bundled `markdownToCarve` helper and Djot migration warnings flag most of
these automatically.
