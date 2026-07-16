---
title: "Examples: Extensions"
description: Tier-2/3 extension features, side by side with the HTML they produce.
---

# Extensions examples

Features provided by extensions on top of the core language: admonitions, abbreviations, mentions and tags, inline extensions, symbols, and cross-reference numbering.

## Admonitions

:::: compare

```carve
::: note
Heads up — this is important.
:::
```

```html
<aside class="admonition note">
  <p>Heads up — this is important.</p>
</aside>
```

::::

Carve renders `:::` blocks by a two-tier rule (PART 9 §12). The eight canonical types — `note`, `tip`, `warning`, `danger`, `info`, `success`, `example`, `quote` — render as `<aside class="admonition {type}">`. Any other identifier (`hint`, `tabs`, `mermaid`, `details`, …) renders as a generic `<div class="{type}">`, the fenced-div primitive the block-extension mechanism builds on. A quoted title after the type becomes a `<p class="admonition-title">` in either tier; the quotes are stripped and never folded into the class.

### Recognized `:::` type words

A `::: name` opener's behavior keys off the **type word** (not a class). Only these words are recognized by core; every other word is an ordinary generic `<div class="{word}">` that an extension may give meaning to.

| Type word | Renders as | Special behavior |
|-----------|-----------|------------------|
| `note` `tip` `warning` `danger` `info` `success` `example` `quote` | `<aside class="admonition {type}">` | Admonition (PART 9 §12); optional quoted title → `<p class="admonition-title">` |
| `\|` (pipe) | `<div class="line-block">` | Line block - preserves the author's per-line layout / soft breaks (PART 9 §23). The token is the pipe, not a word; an inline `::: {.line-block}` is not a fence at all (strict djot) but an ordinary paragraph. |
| *(any other word)* | `<div class="{word}">` | None in core, a generic fenced div; meaning supplied by a Tier-3 extension (e.g. `tabs`, `code-group`, `mermaid`). |

Because the behavior keys to the bare type word, give a purely presentational container a class on an **attribute line before the opener** (`{.mybox}` then `:::`) so you never collide with a recognized type word. The `:::` fence takes no inline attributes (strict djot), so an inline `::: {.mybox}` is a paragraph, not a div.

A quoted title on a canonical type renders inside the `<aside>`:

:::: compare

```carve
::: tip "Pro Tip"
Save early, save often.
:::
```

```html
<aside class="admonition tip">
  <p class="admonition-title">Pro Tip</p>
  <p>Save early, save often.</p>
</aside>
```

::::

A custom type renders as a generic `<div>` with the literal type as its class.

:::: compare

```carve
::: hint "Heads up"
Custom call-out.
:::
```

```html
<div class="hint">
  <p class="admonition-title">Heads up</p>
  <p>Custom call-out.</p>
</div>
```

::::

A `[label]` after the type (and after any quoted header) is a grouping identifier — the same `[label]` token a code fence takes. Core ignores it on a standalone block; a group extension (e.g. tabs) uses it as the tab name. It is the canonical replacement for the older tabs `{label="…"}` / inner-heading convention (both stay supported, deprecated). The `selected` default-tab marker is not a label — it stays a boolean attribute on the preceding `{…}` line. Title and label never trade places: under a group extension the quoted header stays inside the panel as its `admonition-title` line while the `[label]` moves out to the tab button (and the standalone `div-label` caption disappears); a header is never used as the tab name.

:::: compare

```carve
::: tip "Pro Tip" [Build]
Save early, save often.
:::
```

```html
<aside class="admonition tip">
  <p class="admonition-title">Pro Tip</p>
  <p class="div-label">Build</p>
  <p>Save early, save often.</p>
</aside>
```

::::

The quoted opener header is the only source of the visible `admonition-title` paragraph. A `title="…"` key on the preceding attribute line is an ordinary HTML `title` attribute on the wrapper (a hover tooltip) — a separate channel, not a fallback spelling, and it never collides with the opener header:

:::: compare

```carve
{title="attr title"}
::: note "opener title"
Body.
:::
```

```html
<aside class="admonition note" title="attr title">
  <p class="admonition-title">opener title</p>
  <p>Body.</p>
</aside>
```

::::

The title is ordinary inline content - emphasis, code, and the other inline forms work inside it (unlike a code-fence header, which targets an HTML attribute and stays literal):

:::: compare

```carve
::: note "Install *now* via `npm`"
Body.
:::
```

```html
<aside class="admonition note">
  <p class="admonition-title">Install <strong>now</strong> via <code>npm</code></p>
  <p>Body.</p>
</aside>
```

::::

A typeless generic div may carry a label too (a tab member with no semantic type); core still renders a plain `<div>`.

:::: compare

```carve
::: [First]
First panel.
:::
```

```html
<div>
  <p class="div-label">First</p>
  <p>First panel.</p>
</div>
```

::::

As the first token after the fence, the bare `[label]` may sit directly against it (`:::[First]`), the same allowance a code fence makes for `` ```[NPM] ``.

:::: compare

```carve
:::[First]
First panel.
:::
```

```html
<div>
  <p class="div-label">First</p>
  <p>First panel.</p>
</div>
```

::::

:::: compare

```carve
::: warning
Mind the gap.
:::
```

```html
<aside class="admonition warning">
  <p>Mind the gap.</p>
</aside>
```

::::

An admonition may contain multiple block-level children, including lists and code blocks.

:::: compare

````carve
::: tip
Quick steps:

- read the docs
- run the demo
:::
````

```html
<aside class="admonition tip">
  <p>Quick steps:</p>
  <ul>
    <li>read the docs</li>
    <li>run the demo</li>
  </ul>
</aside>
```

::::

## Abbreviations

::: compare

```carve
The HTML spec is essential reading.

*[HTML]: HyperText Markup Language
```

```html
<p>The <abbr title="HyperText Markup Language">HTML</abbr> spec is essential reading.</p>
```

:::

## Mentions and tags

::: compare

```carve
Hey @alice, see #release-1.0.
```

```html
<p>Hey <span class="mention"><strong>@alice</strong></span>, see <span class="tag"><strong>#release-1.0</strong></span>.</p>
```

:::

## Inline extensions

::: compare

```carve
Press :kbd[Ctrl+C] to copy.
```

```html
<p>Press <kbd>Ctrl+C</kbd> to copy.</p>
```

:::

An unrecognized extension name falls back to a generic `<span class="ext-NAME">`.

::: compare

```carve
:foo[bar]
```

```html
<p><span class="ext-foo">bar</span></p>
```

:::

The extension name is an `identifier`, which permits a leading `_`, so `_` is a
valid extension name (grammar `extension_name`).

::: compare

```carve
:_[x]
```

```html
<p><span class="ext-_">x</span></p>
```

:::

An `identifier` must start with a letter or `_`, so a digit-first name is not a valid extension. `:1[x]` stays literal text; `:a1[x]` (a digit after the first letter) is a valid extension and renders as a generic span.

::: compare

```carve
:1[x]
:a1[x]
```

```html
<p>:1[x]
<span class="ext-a1">x</span></p>
```

:::

The `extension_content` runs up to the **first** `]` (`extension_content = {character - ']'}`); a nested `]` therefore closes the extension early and the remainder is literal text.

::: compare

```carve
:foo[a [b] c]
```

```html
<p><span class="ext-foo">a [b</span> c]</p>
```

:::

An authored `{.class}` on a generic inline extension merges into the single `class` attribute — the structural `ext-NAME` class comes first, then the authored classes. There is never a second `class` attribute.

::: compare

```carve
:foo[a]{.cls}
```

```html
<p><span class="ext-foo cls">a</span></p>
```

:::

## Symbols

`:name:` is a symbol: a generic named inline placeholder with no built-in
semantics. The parser records only the name; resolution is processor
configuration, in precedence order: a registered inline-renderer extension
handler for symbol nodes, else the renderer `symbols` map (name →
replacement, emitted raw in the target format — processor configuration is
trusted, the same class as the `renderers` map), else the literal text
`:name:`. Emoji substitution is the common use, not a language feature.
`:type[…]` is still an extension and is tried first.

The name starts with a letter, a digit, `+` or `-` and continues with word
characters, `+` or `-`, so the reaction shortcodes `:+1:` and `:-1:` parse.
It may *not* start with `_`: `:_x_:` would otherwise steal from underline,
so `:_x:` stays literal text. Like mentions and tags, a symbol only opens at
the start of content or after a non-word character: `a:b:c` and `10:30:` stay
literal text, while `(:tada:)` is a symbol. (Djot's symbols open intraword;
Carve's boundary rule deliberately does not — see the djot divergence notes.)

::: compare

```carve
Great :rocket: and :kbd[Ctrl] is an extension.
```

```html
<p>Great :rocket: and <kbd>Ctrl</kbd> is an extension.</p>
```

:::

Boundary and name-shape cases — all of these stay plain text. The colon is
glued to a word character in the first two, and `_` cannot open a name in the
third:

::: compare

```carve
a:b:c and 10:30: meeting, :_x: too.
```

```html
<p>a:b:c and 10:30: meeting, :_x: too.</p>
```

:::

A symbol is recognized *before* smart typography, so a name made of
typographic punctuation is a symbol rather than a substitution: `:+-:` is the
symbol `+-`, not a `±` between colons. The typographic forms still apply
wherever no symbol opens — `a +- b` is `a ± b`, and `word:+-:` has no
boundary, so its `+-` is substituted:

::: compare

```carve
Vote :+1: or :-1:. Tolerance :+-: is a symbol, but a +- b and word:+-: are not.
```

```html
<p>Vote :+1: or :-1:. Tolerance :+-: is a symbol, but a ± b and word:±: are not.</p>
```

:::

A trailing attribute block attaches to the symbol; in HTML output attributes
force a `<span>` wrapper around the resolved (or literal) output so they
have an element to land on. Without attributes no wrapper is emitted.

::: compare

```carve
Launch :rocket:{.big} now.
```

```html
<p>Launch <span class="big">:rocket:</span> now.</p>
```

:::

## Numbered cross-references

A `#` in a caption is a number placeholder: the label is the text before it,
the number is injected in its place, and `</#id>` to the element resolves to
"label + number".

::: compare

```carve
{#fig-sun}
![A sunset](sun.jpg)
^ Figure #: A sunset
```

```html
<figure id="fig-sun">
  <img src="sun.jpg" alt="A sunset">
  <figcaption>Figure 1: A sunset</figcaption>
</figure>
```

:::

Numbers run per label, in document order.

::: compare

```carve
![one](a.jpg)
^ Figure #: one

![two](b.jpg)
^ Figure #: two
```

```html
<figure>
  <img src="a.jpg" alt="one">
  <figcaption>Figure 1: one</figcaption>
</figure>
<figure>
  <img src="b.jpg" alt="two">
  <figcaption>Figure 2: two</figcaption>
</figure>
```

:::

A `</#id>` to a numbered caption fills its text with the label and number.

::: compare

```carve
{#fig-sun}
![A sunset](sun.jpg)
^ Figure #: A sunset

See </#fig-sun> for the colors.
```

```html
<figure id="fig-sun">
  <img src="sun.jpg" alt="A sunset">
  <figcaption>Figure 1: A sunset</figcaption>
</figure>
<p>See <a href="#fig-sun">Figure 1</a> for the colors.</p>
```

:::

Tables use the same placeholder; the number lands in the `<caption>`.

::: compare

```carve
{#tbl-r}
|= Item |= Qty |
| Apple | 3 |
^ Table #: Stock

See </#tbl-r>.
```

```html
<table id="tbl-r">
  <caption>Table 1: Stock</caption>
  <thead><tr><th>Item</th><th>Qty</th></tr></thead>
  <tbody>
    <tr><td>Apple</td><td>3</td></tr>
  </tbody>
</table>
<p>See <a href="#tbl-r">Table 1</a>.</p>
```

:::

Labels bucket independently, so other languages number on their own.

::: compare

```carve
![a](a.jpg)
^ Abbildung #: erstes

![b](b.jpg)
^ Figure #: first
```

```html
<figure>
  <img src="a.jpg" alt="a">
  <figcaption>Abbildung 1: erstes</figcaption>
</figure>
<figure>
  <img src="b.jpg" alt="b">
  <figcaption>Figure 1: first</figcaption>
</figure>
```

:::

A `#word` stays a tag, never a number placeholder.

::: compare

```carve
![chart](c.jpg)
^ See #data for details
```

```html
<figure>
  <img src="c.jpg" alt="chart">
  <figcaption>See <span class="tag"><strong>#data</strong></span> for details</figcaption>
</figure>
```

:::

An escaped `\#` is a literal number sign, never a placeholder.

::: compare

```carve
![price](p.jpg)
^ Costs \# units
```

```html
<figure>
  <img src="p.jpg" alt="price">
  <figcaption>Costs # units</figcaption>
</figure>
```

:::

A caption after a fenced code block makes it a numbered **listing**: the block
is wrapped in a `<figure>`, and `</#id>` resolves to "Listing N" on the same
per-label counter as figures and tables.

::: compare

````carve
{#lst-greet}
```python
def greet():
    return 1
```
^ Listing #: a greeting

See </#lst-greet>.
````

```html
<figure id="lst-greet">
  <pre><code class="language-python">def greet():
    return 1
</code></pre>
  <figcaption>Listing 1: a greeting</figcaption>
</figure>
<p>See <a href="#lst-greet">Listing 1</a>.</p>
```

:::

A caption after a standalone display-math block makes it a numbered
**equation**: the math is wrapped in a `<figure>`, and `</#id>` resolves to
"Equation N" on its own per-label counter. Only a block whose sole content is
the display-math span qualifies; inline math, or display math with trailing
prose, is untouched.

::: compare

```carve
{#eq-emc}
$$`E = mc^2`
^ Equation #: mass-energy

See </#eq-emc>.
```

```html
<figure id="eq-emc">
  <p><span class="math display">\[E = mc^2\]</span></p>
  <figcaption>Equation 1: mass-energy</figcaption>
</figure>
<p>See <a href="#eq-emc">Equation 1</a>.</p>
```

:::
