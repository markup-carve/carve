## The inline attribute interior is space-only, the attribute line is not

**The heading is the name this category was given when the attribute line
still took a tab between attributes, and it is kept deliberately**: every
engine allowlists a category as `NN-slug`. The rule is one POSITION rule
(`CARVE-P4-001`, markup-carve/carve#2978): within a line every slot of an
attribute block is a space run, inline and on a line of its own, and a tab is
indentation only.

CONTROL. The SPACE forms of all four inline positions - the run after `{`, the
run between two attributes, the run before `}`, and the blessed empty block -
are untouched, and a reader that narrowed too far breaks here rather than
silently accepting less:

::: compare

```carve
*x*{.a .b}

*y*{ .c}

*z*{.d }

[w]{ }
```

```html
<p><strong class="a b">x</strong></p>
<p><strong class="c">y</strong></p>
<p><strong class="d">z</strong></p>
<p><span>w</span></p>
```

:::

<!-- Each gap inside the braces is a TAB. -->
A tab inside the block-attribute LINE is content, so the line is no attribute
block and it is paragraph text.

::: compare

```carve
{	.a	.b	}

paragraph
```

```html
<p>{	.a	.b	}</p>
<p>paragraph</p>
```

:::

The block-attribute line is still the one construct whose interior can hold a
leading indentation run: after a `continuation`, the next line's leading
whitespace IS indentation, and a tab there is measured in columns.

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
