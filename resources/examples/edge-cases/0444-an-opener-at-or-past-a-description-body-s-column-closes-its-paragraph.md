## An opener at or past a description body's column closes its paragraph

`BELOW THE BODY'S COLUMN THE BODY ENDS` gives a description body three bands,
and its first band - `A NON-OPENER STILL FOLDS` - is conditioned on an OPEN
PARAGRAPH: a flush-left line that opens nothing folds in because §10 I2's lazy
continuation still reaches it. The two upper bands decide whether there is one.
An opener at the body's column and an opener past it are both the body's own
block content, so §10 I1 closes the paragraph for a visible opener and §10 I5
closes it for a definition or an attribute block. With the paragraph closed the
flush-left line has nothing left to reach and the body ENDS
(markup-carve/carve#1911).

The reported document. `:  ` sets the body's content column at 3 and the
definition is written at 4, one past it. It registers in the shared table, which
closes the paragraph, so `tail` is a document paragraph rather than the body's
second one.

::: compare

```carve
:: term
:  definition
    [r]: /url
tail
```

```html
<dl>
  <dt>term</dt>
  <dd>definition</dd>
</dl>
<p>tail</p>
```

:::

The same definition AT the column, which is the answer the row above has to
match. A reader whose answer moves between column 3 and column 4 is reading
indentation rather than the rule.

::: compare

```carve
:: term
:  definition
   [r]: /url
tail
```

```html
<dl>
  <dt>term</dt>
  <dd>definition</dd>
</dl>
<p>tail</p>
```

:::

A heading is the visible half of the same rule. It opens at its authored base
inside the `dd` and closes the paragraph above it, so `tail` leaves the body
here too.

::: compare

```carve
:: term
:  definition
    # H
tail
```

```html
<dl>
  <dt>term</dt>
  <dd>
    <p>definition</p>
    <h1 id="H">H</h1>
  </dd>
</dl>
<p>tail</p>
```

:::

The heading at the column, the control the row above must equal.

::: compare

```carve
:: term
:  definition
   # H
tail
```

```html
<dl>
  <dt>term</dt>
  <dd>
    <p>definition</p>
    <h1 id="H">H</h1>
  </dd>
</dl>
<p>tail</p>
```

:::

A thematic break is a visible opener with no content of its own, and answers the
same.

::: compare

```carve
:: term
:  definition
    ***
tail
```

```html
<dl>
  <dt>term</dt>
  <dd>
    <p>definition</p>
    <hr>
  </dd>
</dl>
<p>tail</p>
```

:::

So is a table row, which spans lines - the row below it would be the table's,
and a flush-left line is neither that nor the closed paragraph's.

::: compare

```carve
:: term
:  definition
    | a |
tail
```

```html
<dl>
  <dt>term</dt>
  <dd>
    <p>definition</p>
    <table>
      <tbody>
        <tr><td>a</td></tr>
      </tbody>
    </table>
  </dd>
</dl>
<p>tail</p>
```

:::

An attribute block past the column closes the paragraph the same way §10 I5
closes it at the column, and with the body ended there is no following block in
it for the attribute to attach to (§15 A4).

::: compare

```carve
:: term
:  definition
    {.k}
tail
```

```html
<dl>
  <dt>term</dt>
  <dd>definition</dd>
</dl>
<p>tail</p>
```

:::

The same attribute block at the column, which every reader already answers this
way.

::: compare

```carve
:: term
:  definition
   {.k}
tail
```

```html
<dl>
  <dt>term</dt>
  <dd>definition</dd>
</dl>
<p>tail</p>
```

:::

A comment past the column is the row this rule was read off: it closes the
paragraph and ends the body at every column, and the definition row above had to
answer alike.

::: compare

```carve
:: term
:  definition
    %% c
tail
```

```html
<dl>
  <dt>term</dt>
  <dd>definition</dd>
</dl>
<p>tail</p>
```

:::

The band still needs a NON-opener to fold. Over-indented ordinary text opens
nothing, leaves the paragraph open, and both lines join the body - so a reader
that ends the body at every line past the column is wrong in the other
direction.

::: compare

```carve
:: term
:  definition
    more
tail
```

```html
<dl>
  <dt>term</dt>
  <dd>definition
more
tail</dd>
</dl>
```

:::

And an opener that leaves a paragraph OPEN keeps the follower. The quote opens
inside the `dd` and its own paragraph is still open, so `tail` lazily continues
THE QUOTE. What ends the body is a closed paragraph, never the presence of an
opener.

::: compare

```carve
:: term
:  definition
    > q
tail
```

```html
<dl>
  <dt>term</dt>
  <dd>
    <p>definition</p>
    <blockquote><p>q
tail</p></blockquote>
  </dd>
</dl>
```

:::

The band moves with the SEPARATOR WIDTH rather than sitting at column 4: a
four-space separator sets the body's column at 5, and the heading one past it is
at 6.

::: compare

```carve
:: term
:    definition
      # H
tail
```

```html
<dl>
  <dt>term</dt>
  <dd>
    <p>definition</p>
    <h1 id="H">H</h1>
  </dd>
</dl>
<p>tail</p>
```

:::

`THE SURVIVING CONTEXT IS WHATEVER HOLDS THE LIST`. Inside a list item the body
ends at the heading exactly as it does at the top level, and `tail` is then
measured against the ITEM, whose content column it reaches - so it is the item's
own text and not a document paragraph.

::: compare

```carve
- intro

  :: term
  :  definition
      # H
  tail
```

```html
<ul>
  <li>intro
    <dl>
      <dt>term</dt>
      <dd>
        <p>definition</p>
        <h1 id="H">H</h1>
      </dd>
    </dl>
    tail
  </li>
</ul>
```

:::
The line BELOW the ended body is classified in the surviving context whatever
its shape. A definition written one column in is not at the document's column 0,
so it opens nothing there and is ordinary paragraph text - it does not fold back
into the `dd` as the first band's lazy text, because the heading closed the
paragraph that band folds into.

::: compare

```carve
:: term
:  definition
    # H
 [r]: /url
```

```html
<dl>
  <dt>term</dt>
  <dd>
    <p>definition</p>
    <h1 id="H">H</h1>
  </dd>
</dl>
```

:::

The same follower under a heading AT the column, the control the row above must
equal.

::: compare

```carve
:: term
:  definition
   # H
 [r]: /url
```

```html
<dl>
  <dt>term</dt>
  <dd>
    <p>definition</p>
    <h1 id="H">H</h1>
  </dd>
</dl>
```

:::
