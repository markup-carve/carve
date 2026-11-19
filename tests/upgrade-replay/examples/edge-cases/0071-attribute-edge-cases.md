## Attribute edge cases

Classes accumulate; `#id` and `key=value` (bare or quoted) attach in
source order on the `<span>`.

::: compare

```carve
[note]{.a .b #n key=val}
```

```html
<p><span class="a b" id="n" key="val">note</span></p>
```

:::

A quoted value keeps its spaces.

::: compare

```carve
[x]{title="a b"}
```

```html
<p><span title="a b">x</span></p>
```

:::

A `}` inside a quoted value is part of the value — the closing `}` is the
first one outside quotes.

::: compare

```carve
[x]{data-x="{y}"}
```

```html
<p><span data-x="{y}">x</span></p>
```

:::

The same quoted-`}` rule holds for every attribute-bearing construct, not
just spans. On an inline link:

::: compare

```carve
[t](u){k="{y}"}
```

```html
<p><a href="u" k="{y}">t</a></p>
```

:::

On an image:

::: compare

```carve
![a](u){k="{y}"}
```

```html
<img src="u" alt="a" k="{y}">
```

:::

On a heading (via a preceding block-attribute line; the attributes attach
to the `<h1>`):

::: compare

```carve
{k="{y}"}
# H
```

```html
<section id="H">
  <h1 k="{y}">H</h1>
</section>
```

:::

On a generic div (via a preceding block-attribute line; the `:::` fence
itself takes no inline attributes):

:::: compare

```carve
{k="{y}"}
:::
body
:::
```

```html
<div k="{y}">
  <p>body</p>
</div>
```

::::

On an inline extension (the attributes attach to its output element):

::: compare

```carve
:widget[x]{k="{y}"}
```

```html
<p><span class="ext-widget" k="{y}">x</span></p>
```

:::

A value may be single-quoted as well as double-quoted; either form strips
its delimiters (grammar `quoted_value`).

::: compare

```carve
[x]{k='{y}'}
```

```html
<p><span k="{y}">x</span></p>
```

:::

Author attributes on an inline extension attach to its rendered element —
a class lands on the fallback span, and on the semantic element where an
extension supplies one.

::: compare

```carve
:widget[x]{.foo}
```

```html
<p><span class="ext-widget foo">x</span></p>
```

:::

A semantic span carries its attributes on the element it names, because a
consumed name RENAMES the span rather than wrapping it (PART 9 §9).

::: compare

```carve
[x]{#k .key kbd}
```

```html
<p><kbd id="k" class="key">x</kbd></p>
```

:::

A backslash escapes ASCII punctuation inside a quoted value, so the value
can contain a literal quote.

::: compare

```carve
[x]{title="a\"b"}
```

```html
<p><span title="a&quot;b">x</span></p>
```

:::

The same escape applies on a heading's attribute block (a preceding
block-attribute line, §15).

::: compare

```carve
{title="a\"b"}
# H
```

```html
<section id="H">
  <h1 title="a&quot;b">H</h1>
</section>
```

:::

A trailing brace block that yields no attribute is not an attribute block —
on a heading it stays part of the heading text rather than being dropped.

::: compare

```carve
# H {???}
```

```html
<section id="H">
  <h1>H {???}</h1>
</section>
```

:::

An explicit id or class may start with an ASCII digit, matching valid imported
HTML. Attribute keys still use the narrower grammar `identifier`, so a
digit-leading key makes the whole `{…}` stay literal. No other leading
character is newly admitted.

::: compare

```carve
[x]{.123} [y]{#7-x} and [z]{12=v}
```

```html
<p><span class="123">x</span> <span id="7-x">y</span> and [z]{12=v}</p>
```

:::

A non-identifier character anywhere in the name is just as invalid, and one
bad name leaves the whole block literal even alongside a valid class.

::: compare

```carve
[x]{.a!b}
```

```html
<p>[x]{.a!b}</p>
```

:::

::: compare

```carve
[x]{.ok .1}
```

```html
<p><span class="ok 1">x</span></p>
```

:::

A digit, hyphen, or underscore after the first identifier character is fine.

::: compare

```carve
[x]{.a1 #b2 k3=v}
```

```html
<p><span class="a1" id="b2" k3="v">x</span></p>
```

:::
