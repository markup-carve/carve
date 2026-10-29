## A column-0 line after a description-hosted note is a document sibling

A footnote definition written as a description body's content absorbs its opener
the way it does anywhere: the note's floor is its marker column plus two (PART 9
§16), and a block opener there is the note's body. `:  ` sets the body's content
column at 3, so the note stands at column 3 and its floor is 5. The nested list
at 5 reaches it and is the note's; the note is unreferenced, so it renders
nothing and the `<dd>` is empty.

`tail` at column 0 reaches neither the description nor the note, and the
note's paragraph is the deepest one open, so `tail` folds into the note (PART 0
S4). A footnote body takes a lazy line like every container (markup-carve/carve#3885); the section keeps the title of the reading it used to pin.

::: compare

```carve
:: t
:  [^f]: note
     - nested
tail
```

```html
<dl>
  <dt>t</dt>
  <dd></dd>
</dl>
```

:::

Continuation TEXT at the floor answers the same - the opener and the plain line
are one rule, not two - so the parity is pinned rather than assumed.

::: compare

```carve
:: t
:  [^f]: note
     cont
tail
```

```html
<dl>
  <dt>t</dt>
  <dd></dd>
</dl>
```

:::

The column decides, and only column 0 goes to the document. Move `tail` to the
body's own content column 3 and it is the description's, exactly as a plain line
there always is.

::: compare

```carve
:: t
:  [^f]: note
     - nested
   tail
```

```html
<dl>
  <dt>t</dt>
  <dd></dd>
</dl>
```

:::

One column shy of the floor the opener never reached the note, so nothing was
absorbed: the list is the description's own, `tail` lazily continues its item,
and the `<dd>` keeps both. This is the reach boundary the rows above turn on.

::: compare

```carve
:: t
:  [^f]: note
    - nested
tail
```

```html
<dl>
  <dt>t</dt>
  <dd>
    <ul>
      <li>nested
tail</li>
    </ul>
  </dd>
</dl>
```

:::
