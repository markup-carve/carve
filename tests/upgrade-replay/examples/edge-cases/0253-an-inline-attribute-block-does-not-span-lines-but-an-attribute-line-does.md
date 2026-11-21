## An inline attribute block does not span lines, but an attribute line does

Inline `attributes` use spaces within one line. A standalone
`block_attributes` run may span lines, but each continuation must be indented
past its opening `{` (CARVE-P2-035). These historical unindented examples
therefore read as paragraph text.

So a brace run broken across two lines directly after an inline construct is
literal text.

::: compare

```carve
*x*{.a
.b}
```

```html
<p><strong>x</strong>{.a
.b}</p>
```

:::

A standalone attribute line may wrap at the separator, opening padding, or
closing padding when the next line is indented past `{`. These three examples
leave that indentation out, so each brace run stays text.

::: compare

```carve
{.a
.b}

paragraph
```

```html
<p>{.a
.b}</p>
<p>paragraph</p>
```

:::

::: compare

```carve
{
.a}

first

{.b
}

second
```

```html
<p>{
.a}</p>
<p>first</p>
<p>{.b
}</p>
<p>second</p>
```

:::
