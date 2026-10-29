## A quoted attribute value stops at the newline

`quoted_value` is ONE production, read by the inline attribute block and by the
block-attribute line alike, and the two normative files answered it differently:
`resources/grammar.ebnf` built the value out of `character`, which is any
Unicode character, and `resources/carve-core.ohm` excluded a newline at the same
slot. Nothing pinned either answer (markup-carve/carve#888).

It is settled the ohm file's way, because the alternative falsifies a sentence
the grammar already states. An inline attribute block cannot span lines
(markup-carve/carve#897), and since markup-carve/carve#906 its padding takes
`space` and its separator `space+` - neither admits a line break. The quoted
value was the last way through:

::: compare

```carve
*x*{k="a
b"}
```

```html
<p><strong>x</strong>{k=“a
b”}</p>
```

:::

CONTROL. The same value on one line is an ordinary attribute, so the rule is
about the line break and not about the quotes:

::: compare

```carve
*x*{k="a b"}
```

```html
<p><strong k="a b">x</strong></p>
```

:::

The BLOCK-attribute line reads the same production, so a line break inside a
quoted value ends that block too. This is the half with a cost: all three
engines accept it today, and they do not agree on what it means - one keeps the
newline in the value, two collapse it to a space, which no production describes.

::: compare

```carve
{k="a
b"}

paragraph
```

```html
<p>{k=“a
b”}</p>
<p>paragraph</p>
```

:::

CONTROL, and the reason the rule is about the value rather than about the block:
a block attribute may still span lines. `continuation` is where a newline is
admitted, and it sits BETWEEN two tokens, never inside one.

::: compare

```carve
{.a
.b}

paragraph
```

```html
<p class="a b">paragraph</p>
```

:::

CONTROL. A BLANK line is not a continuation - it ends the block, and the braces
stay literal. The ohm grammar accepted one at every slot of `blockAttrs` until
this landed, which no document could show because the layout automaton stops at
a blank line before the rule is reached; it is pinned directly in
`tests/block-attribute-line-breaks.test.mjs` and pinned here as behavior.

::: compare

```carve
{.a

.b}

paragraph
```

```html
<p>{.a</p>
<p>.b}</p>
<p>paragraph</p>
```

:::
