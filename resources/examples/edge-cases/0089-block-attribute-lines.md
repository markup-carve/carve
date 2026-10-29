## Block attribute lines

A `{...}` attribute block on its own line attaches to the **next** block
element and floats forward across intervening blank lines (§15 — reach).

::: compare

```carve
{#id}

Text
```

```html
<p id="id">Text</p>
```

:::

Consecutive attribute blocks targeting the same element accumulate in source
order: the last `id` wins, the last value for a given key wins, and classes
accumulate with no de-duplication (§15 — accumulation; the djot canonical
case).

::: compare

```carve
{#id}
{key=val}
{.foo .bar}
{key=val2}
{.baz}
{#id2}
Okay
```

```html
<p id="id2" key="val2" class="foo bar baz">Okay</p>
```

:::

A single attribute block may wrap across lines — the closing `}` need not sit
on the opening line (§15 — multi-line block).

::: compare

```carve
{#id
 .foo}
Text
```

```html
<p id="id" class="foo">Text</p>
```

:::

The next block can be any container, not just a paragraph. A block-attribute
line before a table attaches to the `<table>`:

::: compare

```carve
{.data}
|= A |= B |
| 1  | 2  |
```

```html
<table class="data">
  <thead>
    <tr><th scope="col">A</th><th scope="col">B</th></tr>
  </thead>
  <tbody>
    <tr><td>1</td><td>2</td></tr>
  </tbody>
</table>
```

:::

…and before a blockquote it attaches to the `<blockquote>`:

::: compare

```carve
{.epigraph}
> To be or not to be.
```

```html
<blockquote class="epigraph"><p>To be or not to be.</p></blockquote>
```

:::

A `{...}` line that directly *trails* a paragraph (no blank line) is still a leading block-attribute line: it interrupts the paragraph and floats forward. With no following block it is dropped:

::: compare

```carve
Para
{.class}
```

```html
<p>Para</p>
```

:::

…and it floats across the blank line to the next block, never attaching backward to the paragraph it follows:

::: compare

```carve
Para
{.class}

Next
```

```html
<p>Para</p>
<p class="class">Next</p>
```

:::
