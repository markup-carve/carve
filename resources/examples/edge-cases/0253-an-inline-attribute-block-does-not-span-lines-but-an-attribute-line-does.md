## An inline attribute block does not span lines, but an attribute line does

`attributes` pads and separates with `opt_ws`, which grammar.ebnf annotates
"spaces/tabs only, no line breaks". The line-spanning form is a different
production: `block_attributes` separates with `attr_separator = (whitespace |
continuation), opt_ws`, and `continuation` is where a newline is admitted.

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

A standalone attribute line may be written the same way, and it attaches to the
block below it. The line break is admitted in the padding as well as between
two attributes, so all three placements are one block.

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
<p class="a">first</p>
<p class="b">second</p>
```

:::
