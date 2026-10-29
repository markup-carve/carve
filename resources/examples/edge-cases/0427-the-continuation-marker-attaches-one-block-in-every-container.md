## The continuation marker attaches one block in every container

§17 L3 defines `+` as one operation: ownership of the next flush-left block
passes to the container at column 0 of the line's quote level, and the block is
then parsed like any other. The count is ONE block, and the container does not
answer differently because of what kind of block it is attaching.

The clause's own example, in a list item: the marker takes the paragraph and
leaves the quote at document level, where a second marker would be needed to
attach it.

::: compare

```carve
- a
+
para
> q
```

```html
<ul>
  <li>a
    para
  </li>
</ul>
<blockquote><p>q</p></blockquote>
```

:::

The same document in a footnote body. The note takes the paragraph and nothing
else — the reading that made this two blocks was the extent measured without
the one-block narrowing every other container applies.

::: compare

```carve
[^n]: a
+
para
> q

see[^n]
```

```html
<blockquote><p>q</p></blockquote>
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>a</p>
      <p>para<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

And in a definition description, which carries `continuation_marker_block` for
the same reason.

::: compare

```carve
:: t
:  a
+
para
> q
```

```html
<dl>
  <dt>t</dt>
  <dd>
    <p>a</p>
    <p>para</p>
  </dd>
</dl>
<blockquote><p>q</p></blockquote>
```

:::

A quote attached to a quote NESTS, exactly as a list or a fence attached to one
would. The marker only ever attaches, so a following quote line cannot make it
a no-op.

::: compare

```carve
> a
+
> q
```

```html
<blockquote>
  <p>a</p>
  <blockquote><p>q</p></blockquote>
</blockquote>
```

:::
