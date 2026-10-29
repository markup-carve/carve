## List item attributes

An attribute block that *abuts* a list marker (no space between the marker and `{`) attaches its attributes to the `<li>` itself. The marker's required space follows the block (grammar `item_attributes`, PART 9 §15). This works for bullet and ordered markers alike:

::: compare

```carve
-{.c} A classed item.
-{#intro} An item with an id.
```

```html
<ul>
  <li class="c">A classed item.</li>
  <li id="intro">An item with an id.</li>
</ul>
```

:::

Ordered markers carry the abutting block the same way, before the required space, in every dialect:

::: compare

```carve
3.{#x k=v} A numbered item with id and key-value.
```

```html
<ol start="3">
  <li id="x" k="v">A numbered item with id and key-value.</li>
</ol>
```

:::

::: compare

```carve
a.{.c} An alpha item.
```

```html
<ol type="a">
  <li class="c">An alpha item.</li>
</ol>
```

:::

For a task item the block abuts the marker, before the task marker:

::: compare

```carve
-{.c} [ ] A classed task item.
```

```html
<ul class="task-list">
  <li class="c"><input type="checkbox" disabled aria-label="A classed task item."> A classed task item.</li>
</ul>
```

:::

The empty block `{}` is a blessed exception: it yields a bare `<li>` (so a default-attribute processor can target the item):

::: compare

```carve
-{} A bare item via the empty block.
```

```html
<ul>
  <li>A bare item via the empty block.</li>
</ul>
```

:::

The abutting block is consumed as list-item attributes only when it yields at least one attribute or is the blessed empty block. A block that is not an attribute block (for example a forced `{+…+}` emphasis span) leaves the `-{` as ordinary text, so no list opens:

::: compare

```carve
-{+a+} text
```

```html
<p>-<ins>a</ins> text</p>
```

:::

A **space** before the brace makes the block ordinary item content, not a list-item attribute. Because no inline element abuts it, the block is not an attribute block at all: the braces stay literal (grammar PART 9 §14, `inline_span` requires a `[...]` host):

::: compare

```carve
- {.c} text
```

```html
<ul>
  <li>{.c} text</li>
</ul>
```

:::

The same rule holds anywhere in inline content: a `{...}` block with no abutting host (at the start of the content, or after whitespace) is literal text, never silently dropped:

::: compare

```carve
para {.c} more
```

```html
<p>para {.c} more</p>
```

:::
