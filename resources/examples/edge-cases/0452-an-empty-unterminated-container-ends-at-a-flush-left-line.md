## An empty unterminated container ends at a flush-left line

A flush-left plain line folds into a host only as LAZY CONTINUATION of an open
paragraph. An EMPTY unterminated container has no paragraph to continue, so the
line is a new block at column 0 and closes what is above it. The list host
answered that way already; the description host folded the line INTO the
container instead, starting a fresh paragraph three columns to the left of it,
on no clause at all (markup-carve/carve#1938).

The list host, which was the twin nothing pinned either.

:::: compare

```carve
- d
  ::: d
tail
```

```html
<ul>
  <li>d
    <div class="d">

    </div>
  </li>
</ul>
<p>tail</p>
```

::::

The description host now agrees. This is the answer that moved.

:::: compare

```carve
:: t
:  d
   ::: d
tail
```

```html
<dl>
  <dt>t</dt>
  <dd>
    <p>d</p>
    <div class="d">

    </div>
  </dd>
</dl>
<p>tail</p>
```

::::

The marker-line spelling of the same body moves with it, since the container it
opens is equally empty.

A marker-line colon opener under a list host opens the same way: `- ::: d`
opens an empty container whatever follows, which
`161-below-content-column-div-body-in-a-list-item-stays-literal` and
`364-only-lazy-folding-demotes-a-marker-line-colon-opener` pin.

::: compare

```carve
:: t
:  ::: d
tail
```

```html
<dl>
  <dt>t</dt>
  <dd>
    <div class="d">

    </div>
  </dd>
</dl>
<p>tail</p>
```

:::

IT IS ABOUT COLUMN 0, NOT ABOUT EMPTINESS ALONE. A follower AT the container's
own content column is inside it, and starts a paragraph there as it always did.

:::: compare

```carve
:: t
:  d
   ::: d
   tail
```

```html
<dl>
  <dt>t</dt>
  <dd>
    <p>d</p>
    <div class="d">
      <p>tail</p>
    </div>
  </dd>
</dl>
```

::::

AND IT IS ABOUT EMPTINESS, NOT ABOUT COLUMN 0 ALONE. Give the container a body
and the flush-left line has an open paragraph to continue again, so it folds in
as lazy continuation.

:::: compare

```carve
:: t
:  d
   ::: d
   body
tail
```

```html
<dl>
  <dt>t</dt>
  <dd>
    <p>d</p>
    <div class="d">
      <p>body
tail</p>
    </div>
  </dd>
</dl>
```

::::
