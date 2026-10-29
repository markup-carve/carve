## Table cell padding must be a space

A table cell has a padding slot at each end -- the whitespace between the
opening `|` and the cell content, and between the content and the closing `|`.
Both are spelled `space` (grammar.ebnf `delimiter_cell`, `header_cell`,
`data_cell`, `rowspan_marker`, `colspan_marker`). Every one of them sits after
the row's opening pipe, so every one of them is INLINE, and a tab is syntax
only in a line's leading indentation run (PART 7, MARKER SEPARATORS AND PADDING
SLOTS).

A tab written in one of those slots is therefore not padding. It stays where it
is and becomes ordinary cell content, which is a visible answer rather than a
rejection: the cell keeps the tab, and a delimiter cell stops being one.

Each end is pinned separately. A padding rule is easy to implement at one end
only, and a document carrying a tab at both ends cannot tell a half-fix from a
whole one -- the shape carve#901 found at the admonition opener.

A data cell, tab-first at the leading slot:

:::: compare

```carve
|	a |	b |
```

```html
<table>
  <tbody>
    <tr><td>	a</td><td>	b</td></tr>
  </tbody>
</table>
```

::::

The slot is a RUN, and the rule is about the whole run rather than its first
character. Both mixed spellings keep the tab as content too -- the one that
survives a fix written as "the first character must be a space" is the one with
the space first.

:::: compare

```carve
| 	a | 	b |
```

```html
<table>
  <tbody>
    <tr><td>	a</td><td>	b</td></tr>
  </tbody>
</table>
```

::::

:::: compare

```carve
|	 a |	 b |
```

```html
<table>
  <tbody>
    <tr><td>	 a</td><td>	 b</td></tr>
  </tbody>
</table>
```

::::

The trailing slot answers the same way, and reverts independently of the
leading one:

:::: compare

```carve
| a	| b	|
```

```html
<table>
  <tbody>
    <tr><td>a	</td><td>b	</td></tr>
  </tbody>
</table>
```

::::

:::: compare

```carve
| a 	| b 	|
```

```html
<table>
  <tbody>
    <tr><td>a 	</td><td>b 	</td></tr>
  </tbody>
</table>
```

::::

A header cell carries the same two slots, after its `=` marker -- and since
a tab is not the space that terminates a marker run, the `=` is content along
with it (PART 9 §5 T11):

:::: compare

```carve
|=	h |=	i |
| 1 | 2 |
```

```html
<table>
  <tbody>
    <tr><td>=	h</td><td>=	i</td></tr>
    <tr><td>1</td><td>2</td></tr>
  </tbody>
</table>
```

::::

:::: compare

```carve
|=	 h |=	 i |
| 1 | 2 |
```

```html
<table>
  <tbody>
    <tr><td>=	 h</td><td>=	 i</td></tr>
    <tr><td>1</td><td>2</td></tr>
  </tbody>
</table>
```

::::

:::: compare

```carve
|= h	|= i	|
| 1 | 2 |
```

```html
<table>
  <thead>
    <tr><th scope="col">h	</th><th scope="col">i	</th></tr>
  </thead>
  <tbody>
    <tr><td>1</td><td>2</td></tr>
  </tbody>
</table>
```

::::

:::: compare

```carve
|= h 	|= i 	|
| 1 | 2 |
```

```html
<table>
  <thead>
    <tr><th scope="col">h 	</th><th scope="col">i 	</th></tr>
  </thead>
  <tbody>
    <tr><td>1</td><td>2</td></tr>
  </tbody>
</table>
```

::::

A delimiter cell is the one slot whose failure is structural rather than
textual. With a tab in the padding the cell is no longer a `delimiter_cell`, so
the second line is not a delimiter row: no header is promoted, no alignment is
assigned, and the `---` run is ordinary inline content that smart typography
renders as an em dash.

:::: compare

```carve
| a | b |
|	--- |	--- |
| 1 | 2 |
```

```html
<table>
  <tbody>
    <tr><td>a</td><td>b</td></tr>
    <tr><td>	—</td><td>	—</td></tr>
    <tr><td>1</td><td>2</td></tr>
  </tbody>
</table>
```

::::

:::: compare

```carve
| a | b |
| 	--- | 	--- |
| 1 | 2 |
```

```html
<table>
  <tbody>
    <tr><td>a</td><td>b</td></tr>
    <tr><td>	—</td><td>	—</td></tr>
    <tr><td>1</td><td>2</td></tr>
  </tbody>
</table>
```

::::

:::: compare

```carve
| a | b |
| ---	| ---	|
| 1 | 2 |
```

```html
<table>
  <tbody>
    <tr><td>a</td><td>b</td></tr>
    <tr><td>—	</td><td>—	</td></tr>
    <tr><td>1</td><td>2</td></tr>
  </tbody>
</table>
```

::::

The two span markers are padding around a single token, so a tab beside one
makes the cell ordinary content and the span does not happen:

:::: compare

```carve
| a | b |
|	^ | c |
```

```html
<table>
  <tbody>
    <tr><td>a</td><td>b</td></tr>
    <tr><td>	^</td><td>c</td></tr>
  </tbody>
</table>
```

::::

:::: compare

```carve
| a | b |
| c |	< |
```

```html
<table>
  <tbody>
    <tr><td>a</td><td>b</td></tr>
    <tr><td>c</td><td>	&lt;</td></tr>
  </tbody>
</table>
```

::::

A continuation row's cells are `data_cell`s too (grammar.ebnf
`continuation_row`), so they carry the same two slots. This is the spelling an
implementation is most likely to pad in a second place, and a fix applied only
to the standard row leaves it joining the tab away.

:::: compare

```carve
| a | b |
+	x | y |
```

```html
<table>
  <tbody>
    <tr><td>a 	x</td><td>b y</td></tr>
  </tbody>
</table>
```

::::

:::: compare

```carve
| a | b |
+ x	| y	|
```

```html
<table>
  <tbody>
    <tr><td>a x	</td><td>b y	</td></tr>
  </tbody>
</table>
```

::::

:::: compare

```carve
| a | b |
+ x | y |
```

```html
<table>
  <tbody>
    <tr><td>a x</td><td>b y</td></tr>
  </tbody>
</table>
```

::::

The spaced spellings are unchanged, and so is a cell with more than one space
-- cardinality is a separate question from the terminal. A cell with NO padding
is a separate question again: an unmarked cell is unchanged, while a marked one
has nothing to end its run and keeps the marker as content (T11).

:::: compare

```carve
|=h|=  i |
|a|  b  |
```

```html
<table>
  <tbody>
    <tr><td>=h</td><th scope="row">i</th></tr>
    <tr><td>a</td><td>b</td></tr>
  </tbody>
</table>
```

::::

:::: compare

```carve
| a | b |
| --- | ---: |
| 1 | 2 |
```

```html
<table>
  <thead>
    <tr><th scope="col">a</th><th scope="col" style="text-align: right;">b</th></tr>
  </thead>
  <tbody>
    <tr><td>1</td><td style="text-align: right;">2</td></tr>
  </tbody>
</table>
```

::::

:::: compare

```carve
| a | b |
| ^ | c |
```

```html
<table>
  <tbody>
    <tr><td rowspan="2">a</td><td>b</td></tr>
    <tr><td>c</td></tr>
  </tbody>
</table>
```

::::

:::: compare

```carve
| a | b |
| c | < |
```

```html
<table>
  <tbody>
    <tr><td>a</td><td>b</td></tr>
    <tr><td colspan="2">c</td></tr>
  </tbody>
</table>
```

::::
