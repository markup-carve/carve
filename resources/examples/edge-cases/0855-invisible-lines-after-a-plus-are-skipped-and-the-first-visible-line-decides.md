---
page: edge-lists
---

## Invisible lines after a plus are skipped and the first visible line decides

A `%%` line and one-line link or abbreviation definition are erased before the CARVE-P9-067 test (carve#5012). A `%%%` span, note definition or attribute line remains block-level; the gates apply after it (carve#4449). A blank line, the end of input or a sibling refuses the `+`, which is then a plain letter.

::: compare

```carve
- +
%% c

text
```

```html
<ul>
  <li></li>
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
  <li></li>
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
  <li></li>
  <li>b</li>
</ul>
```

:::

The erased comment supplies no boundary. The content-column line becomes the next candidate and attaches under CARVE-P9-067.

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
