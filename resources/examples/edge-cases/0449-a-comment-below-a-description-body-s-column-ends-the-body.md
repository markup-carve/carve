## A comment below a description body's column ends the body

Since markup-carve/carve#4907 a `%%%` opener opens its span with no closer
lookahead: without a closer it hides everything up to a line that misses its
owner or the end of its container (PART 9 §28). The rows below follow that
reading; where the prose describes a closerless opener as a `%%` line or a
closer ahead as deciding the span, it records the reading the ruling replaced.

A matched `%%%` span opened at DOCUMENT column 0 below a description body ends
the body. The opener is classified in the surviving context, where the matching
run below it makes it a comment BLOCK, and the line between the two delimiters
renders nothing (markup-carve/carve#1930). A list item answers the same way
(PART 0 X1, corpus 214).

What ends the body there is the column-0 line after the span. A comment itself
closes no description body at any column (carve#4862, which replaced the closing
reading of carve#3885): the next visible line picks the owner, so a follower at
the body's column stays in the body. That holds for the `%%` line form, a `%%%`
with no closer ahead, and a matched span, as in a list item.

TERMINATED IS WHAT MAKES IT A BLOCK, and the degraded control below is why that
has to be said: §28's degradation is total, so an opener with no exact-width
closer ahead is one `%%` line comment for every question the layout asks, and it
opens nothing here either.

The ticket's document.

::: compare

```carve
:: t
:  x
%%%
y
%%%
z
```

```html
<dl>
  <dt>t</dt>
  <dd>x</dd>
</dl>
<p>z</p>
```

:::

The width is not a parameter -- a wider run answers the same way.

::: compare

```carve
:: t
:  x
%%%%
y
%%%%
z
```

```html
<dl>
  <dt>t</dt>
  <dd>x</dd>
</dl>
<p>z</p>
```

:::

The closer is looked for AHEAD rather than on the next line, so a two-line body
is the same block.

::: compare

```carve
:: t
:  x
%%%
y
w
%%%
z
```

```html
<dl>
  <dt>t</dt>
  <dd>x</dd>
</dl>
<p>z</p>
```

:::

DEGRADED IS THE CONTROL. With no closer ahead the opener is one line comment,
it opens nothing, and the lines below it are retained as a new paragraph of the
body.

::: compare

```carve
:: t
:  x
%%%
y
z
```

```html
<dl>
  <dt>t</dt>
  <dd>x</dd>
</dl>
```

:::

The `%%` LINE FORM is the other control. It is invisible at any column and opens
no block; the body consumes it and keeps the following line as a new paragraph.

::: compare

```carve
:: t
:  x
%% c
z
```

```html
<dl>
  <dt>t</dt>
  <dd>x</dd>
</dl>
<p>z</p>
```

:::

AT THE BODY'S OWN COLUMN the fence is the body's content, its closer is not in
the body, and both delimiters degrade to line comments. This row is what makes
column 0 legible as the document's column rather than the body's.

::: compare

```carve
:: t
:  x
   %%%
y
   %%%
z
```

```html
<dl>
  <dt>t</dt>
  <dd>x</dd>
</dl>
<p>y</p>
```

:::

THE ITEM HOST IS THE TWIN, pinned beside the description so the two cannot drift
apart again.

::: compare

```carve
- a
%%%
c
%%%
b
```

```html
<ul>
  <li>a</li>
</ul>
<p>b</p>
```

:::

A FOLLOWER AT THE BODY'S OWN COLUMN after a line comment below it stays in the
body: a comment closes no description body, so the follower's column decides
(carve#4862). The `%%` line form first.

::: compare

```carve
:: t
:  x
%% c
   more
```

```html
<dl>
  <dt>t</dt>
  <dd>
    <p>x</p>
    <p>more</p>
  </dd>
</dl>
```

:::

The DEGRADED fence, same answer: with no closer ahead it is a line comment.

::: compare

```carve
:: t
:  x
%%%
   more
```

```html
<dl>
  <dt>t</dt>
  <dd>x</dd>
</dl>
```

:::

The terminated fence at column 0 closes no body either, so the same follower
stays in it.

::: compare

```carve
:: t
:  x
%%%
y
%%%
   more
```

```html
<dl>
  <dt>t</dt>
  <dd>
    <p>x</p>
    <p>more</p>
  </dd>
</dl>
```

:::

THE COLUMN DECIDES FOR A MATCHED SPAN. One column in it is no longer at the
enclosing context's opener column, so the body consumes the span whole and keeps
the line after it.

::: compare

```carve
:: t
:  x
 %%%
y
 %%%
z
```

```html
<dl>
  <dt>t</dt>
  <dd>x</dd>
</dl>
<p>z</p>
```

:::

Two columns in, the last column below the body's own, answers the same.

::: compare

```carve
:: t
:  x
  %%%
y
  %%%
z
```

```html
<dl>
  <dt>t</dt>
  <dd>x</dd>
</dl>
<p>z</p>
```

:::

And the line form one column in, with a follower back at the body's column,
which the body keeps.

::: compare

```carve
:: t
:  x
 %% c
   more
```

```html
<dl>
  <dt>t</dt>
  <dd>
    <p>x</p>
    <p>more</p>
  </dd>
</dl>
```

:::
