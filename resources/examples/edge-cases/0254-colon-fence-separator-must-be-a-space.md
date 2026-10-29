## Colon fence separator must be a space

The colon fence has ONE separator slot -- the whitespace immediately after the
fence run -- and all four openers share it. It is a MARKER SEPARATOR (PART 7,
MARKER SEPARATORS AND PADDING SLOTS): the token after it selects an admonition,
a div, a line block or a local hard-break block, so it is spelled `space` and a
tab does not satisfy it. A tabbed opener is an ordinary paragraph, exactly as a
tab after a heading, list or definition marker already is.

The four openers are pinned separately because implementations decide them in
four separate places. In carve-rs the same rule lived in four branches, and
fixing the first left the other three opening; carve-js and carve-php each had
their own split. One representative shape would have covered a quarter of that.

An admonition opener:

:::: compare

```carve
:::	note
x
:::
```

```html
<p>:::	note
x
:::</p>
```

::::

The separator is a run, and the rule is about the whole run rather than its
first character. Both mixed spellings are prose too -- the shape that survives a
fix written as "the first character must be a space" is the one with the space
first.

:::: compare

```carve
::: 	note
x
:::
```

```html
<p>::: 	note
x
:::</p>
```

::::

:::: compare

```carve
:::	 note
x
:::
```

```html
<p>:::	 note
x
:::</p>
```

::::

A bare `[label]` may sit flush against the fence (`:::[First]`), so this slot is
OPTIONAL in the div opener. Optional is a different property from a different
role: when the slot IS written, it answers the same way.

:::: compare

```carve
:::	[First]
x
:::
```

```html
<p>:::	[First]
x
:::</p>
```

::::

:::: compare

```carve
::: 	[First]
x
:::
```

```html
<p>::: 	[First]
x
:::</p>
```

::::

A line block:

:::: compare

```carve
:::	|
x
:::
```

```html
<p>:::	|
x
:::</p>
```

::::

:::: compare

```carve
::: 	|
x
:::
```

```html
<p>::: 	|
x
:::</p>
```

::::

A local hard-break block. The trailing backslash is no longer a block selector
once the line is prose, so it is read as ordinary inline content and produces a
hard break inside the paragraph -- which is itself the discriminator, since the
recognized form would have produced a `div.hardbreaks` wrapper instead.

:::: compare

```carve
:::	\
x
:::
```

```html
<p>:::	<br>
x
:::</p>
```

::::

:::: compare

```carve
::: 	\
x
:::
```

```html
<p>::: 	<br>
x
:::</p>
```

::::

Cardinality is a separate question from the terminal, and this case is the guard
against a fix that drifts the other way. `space` names the character, not the
width: a run of more than one space still opens the block.

:::: compare

```carve
:::  note
x
:::
```

```html
<aside class="admonition note" aria-label="Note">
  <p>x</p>
</aside>
```

::::
