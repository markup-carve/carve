## A collected definition closes the item paragraph

A link or footnote definition at an item's content column is an I5 block and
ends the paragraph above it. A following nonzero line below that column has no
paragraph to continue, so the item closes; §24 C3 reserves that path for a
comment. Here column 1 is below the bullet's content column 2.

::: compare

```carve
- a
  [r]: /u
 more
tail
```

```html
<ul>
  <li>a</li>
</ul>
<p>more
tail</p>
```

:::

The bare decimal-dot marker claims the same two columns as the bullet, so it
has the same boundary rather than the three-column boundary of `1. `.

::: compare

```carve
. a
  [r]: /u
 more
tail
```

```html
<ol>
  <li>a</li>
</ol>
<p>more
tail</p>
```

:::

A footnote body begins two columns beyond its definition. For `1. ` the
definition is at column 3 and its body at column 5; column 4 is item prose, so
it reopens the paragraph and the flush-left line folds into it.

::: compare

```carve
1. a
   [^f]: note
    more
tail
```

```html
<ol>
  <li>a</li>
</ol>
```

:::

At the body column the line remains part of the footnote block and opens no
item paragraph. The flush-left line is consequently outside the item.

A footnote body takes a lazy line like every container (markup-carve/carve#3885), so the unmarked line below folds into the note:
::: compare

```carve
- a
  [^f]: note
    more
tail

see[^f]
```

```html
<ul>
  <li>a</li>
</ul>
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>note
more
tail<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::
