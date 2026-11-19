## A tab inside a line is content in a label and after a definition marker

Inline spacing is a run of U+0020 and nothing else. A link or footnote label
key trims and collapses space runs only (PART 9R R1, R2), so a tab or a form
feed inside a label is a character of the label. A reference definition's
separator is `:` followed by one or more spaces (`CARVE-P3-009`); a tab after
it starts the destination slot, which cannot hold it, and the line is not a
definition (markup-carve/carve#2978).

A tab inside a link label is content, so `a<TAB>b` and `a b` are two labels and the reference stays literal text.

::: compare

```carve
see [t][a	b]

[a b]: /u
```

```html
<p>see [t][a	b]</p>
```

:::

<!-- The label holds a FORM FEED (U+000C) between `a` and `b`. -->
A form feed inside a label is content as well.

::: compare

```carve
see [t][ab]

[a b]: /u
```

```html
<p>see [t][ab]</p>
```

:::

Space runs still collapse, and spaces at either end are trimmed.

::: compare

```carve
see [t][ a  b ]

[a b]: /u
```

```html
<p>see <a href="/u">t</a></p>
```

:::

A footnote label takes the same key: the tab is content, the reference stays literal and the unreferenced definition is dropped.

::: compare

```carve
see [^a	b]

[^a b]: note
```

```html
<p>see [^a	b]</p>
```

:::

The definition separator is a run of spaces. A tab after the run is content, which leaves the destination empty, so the line is a paragraph.

::: compare

```carve
see [t][a]

[a]: 	/u
```

```html
<p>see [t][a]</p>
<p>[a]: 	/u</p>
```

:::

Two spaces are a run, and the line is a definition.

::: compare

```carve
see [t][a]

[a]:  /u
```

```html
<p>see <a href="/u">t</a></p>
```

:::
