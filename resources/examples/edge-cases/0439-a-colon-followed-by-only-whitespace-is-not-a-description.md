## A colon followed by only whitespace is not a description

A description marker takes a separator space and non-empty content (PART 2,
MARKER REQUIRES CONTENT), so a `:` line carrying nothing but whitespace opens no
description. It is a plain line under the open term, and the term folds it as a
soft break. The line's trailing whitespace run is dropped (PART 2, NO TRAILING
WHITESPACE), which makes every such spelling the same document as the bare
marker - the separator's width and the marker's own trailing space cannot carry
meaning.

The separator is `space`, and a tab never satisfies it (PART 1, MARKER
SEPARATORS AND PADDING SLOTS). The tab spelling is therefore refused at the
separator rather than at the content test, and lands in the same place.

One separator space.

::: compare

```carve
:: t
: 

flush
```

```html
<dl>
  <dt>t
:</dt>
</dl>
<p>flush</p>
```

:::

Two, and three: the width is not read, because there is nothing for it to
position.

::: compare

```carve
:: t
:  

flush
```

```html
<dl>
  <dt>t
:</dt>
</dl>
<p>flush</p>
```

:::

::: compare

```carve
:: t
:   

flush
```

```html
<dl>
  <dt>t
:</dt>
</dl>
<p>flush</p>
```

:::

A tab, which the separator does not admit.

::: compare

```carve
:: t
:	

flush
```

```html
<dl>
  <dt>t
:</dt>
</dl>
<p>flush</p>
```

:::

The content control. `{}` is literal text, not an attribute block, so the
marker has content and the description forms.

::: compare

```carve
:: t
: {}

flush
```

```html
<dl>
  <dt>t</dt>
  <dd>{}</dd>
</dl>
<p>flush</p>
```

:::

The whitespace control. A bare marker has an empty trailing run, so the fold
leaves nothing to drop.

::: compare

```carve
:: t
:

flush
```

```html
<dl>
  <dt>t
:</dt>
</dl>
<p>flush</p>
```

:::

The cell between those two: a separator space, and then a tab. The separator IS
satisfied here, so this spelling is refused at the content test rather than at
the separator. After the greedy space run a lone tab is trailing whitespace and
nothing else, and MARKER REQUIRES CONTENT ignores trailing whitespace, so the
marker opens nothing and the line folds like the rows above. The greedy run is
spaces only, which is what leaves the tab to be judged as content
(markup-carve/carve#1836).

::: compare

```carve
:: t
: 	

flush
```

```html
<dl>
  <dt>t
:</dt>
</dl>
<p>flush</p>
```

:::

The reach control. The same separator space and the same tab, with text behind
it: the content test now finds a character that is neither space nor tab, so the
description opens and the tab is content. Only a run of nothing but spaces and
tabs is trailing whitespace.

::: compare

```carve
:: t
: 	text

flush
```

```html
<dl>
  <dt>t</dt>
  <dd>text</dd>
</dl>
<p>flush</p>
```

:::
