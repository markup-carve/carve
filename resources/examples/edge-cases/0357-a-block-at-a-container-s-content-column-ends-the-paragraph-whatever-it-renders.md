## A block at a container's content column ends the paragraph, whatever it renders

The content column IS the container body's column 0 (§24 C3), so a line there
is read as a BLOCK - and a block ends the paragraph above it. What the block
RENDERS is not a parameter: a comment, a definition and an attribute block all
render nothing and all three end the paragraph, none of them closes the
container, and the container ends because the FOLLOWING line arrives at
DOCUMENT column 0 with nothing to fold into (markup-carve/carve#1350,
markup-carve/carve#1357).

An ATTRIBUTE BLOCK is the control that decides the argument, because it is
invisible and every implementation already ends the item on it:

::: compare

```carve
- a
  {.k}
tail
```

```html
<ul>
  <li>a</li>
</ul>
<p>tail</p>
```

:::

So a COMMENT answers alike. It ends the paragraph and not the item; `tail` ends
the item because it is at column 0:

::: compare

```carve
- a
  %% c
tail
```

```html
<ul>
  <li>a</li>
</ul>
<p>tail</p>
```

:::

The FENCE spelling travels with its opener (§24 C3), so it answers the same:

::: compare

```carve
- a
  %%% c
  %%%
tail
```

```html
<ul>
  <li>a</li>
</ul>
<p>tail</p>
```

:::

THE RULE IS OVER THE BLOCK, NOT OVER ITS FIRST LINE. A footnote definition's
indented body continuation is part of that definition - the footnote parser
consumes it and permits no lazy continuation into it - so nothing of the item's
is open across any of it:

A footnote body takes a lazy line like every container (markup-carve/carve#3885), so the unmarked line below folds into the note:
::: compare

```carve
- a
  [^f]: t
    more
tail

x[^f]
```

```html
<ul>
  <li>a</li>
</ul>
<p>x<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>t
more
tail<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

which is the same answer the ONE-LINE spelling of that definition already gets,
and that is the point - two spellings of one definition had been answering
differently:

::: compare

```carve
- a
  [^f]: t
tail

x[^f]
```

```html
<ul>
  <li>a</li>
</ul>
<p>x<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>t
tail<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

A LINK reference definition has no body - it is one line in Carve - so an
indented line under it is ordinary item text and reopens the paragraph. This is
the control that says the rule is about the BLOCK'S EXTENT and not about
indentation, and it is unanimous:

::: compare

```carve
- a
  [r]: /u
    "T"
tail

[r][]
```

```html
<ul>
  <li>a
    “T”
tail
  </li>
</ul>
<p><a href="/u">r</a></p>
```

:::
