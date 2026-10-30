---
page: edge-lists
---

## Invisible lines after a plus are skipped and the first visible line decides

Comments of either spelling, link and note definitions and attribute lines between a `+` and the next line are read in the host, and the CARVE-P9-067 gates apply to the first visible line after them (carve#4449). A blank line, the end of input or a sibling refuses the `+`, which is then a plain letter.

::: compare

```carve
- +
%% c

text
```

```html
<ul>
  <li>+</li>
</ul>
<p>text</p>
```

:::

The fenced comment spelling reads the same.

::: compare

```carve
- +
%%%
c
%%%

text
```

```html
<ul>
  <li>+</li>
</ul>
<p>text</p>
```

:::

A sibling after the comment refuses the `+` too.

::: compare

```carve
- +
%% c
- b
```

```html
<ul>
  <li>+</li>
  <li>b</li>
</ul>
```

:::

A line at the content column is not at the marker column.

::: compare

```carve
- +
%% c
  text
```

```html
<ul>
  <li>+</li>
</ul>
<p>text</p>
```

:::

A line at the marker column attaches, in both comment spellings.

::: compare

```carve
- +
%% c
text
```

```html
<ul>
  <li>text</li>
</ul>
```

:::

::: compare

```carve
- +
%%%
c
%%%
text
```

```html
<ul>
  <li>text</li>
</ul>
```

:::
