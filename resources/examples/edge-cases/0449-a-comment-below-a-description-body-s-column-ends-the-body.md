## A comment below a description body's column ends the body

A matched `%%%` span opened at DOCUMENT column 0 below a description body ends
the body. The opener is classified in the surviving context, where the matching
run below it makes it a comment BLOCK, and the line between the two delimiters
renders nothing (markup-carve/carve#1930). A list item answers the same way
(PART 0 X1, corpus 214).

Every other comment below the body's column ends the body as well: a comment is
an ordinary line for ownership (rule A, carve#3885, which replaced the
retention reading of markup-carve/carve#2978), so the line after it is not taken
back into the body. That holds for the `%%` line form, a `%%%` with no closer
ahead, and a matched span written past column 0, as in a list item.

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
<p>y
z</p>
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
<p>z</p>
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

A FOLLOWER AT THE BODY'S OWN COLUMN after a line comment below it is a
document paragraph: a comment is an ordinary line for ownership (rule A,
carve#3885), so below the column it closes the body, and a closed body takes no
later line back. The `%%` line form first.

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
  <dd>x</dd>
</dl>
<p>more</p>
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
<p>more</p>
```

:::

The terminated fence at column 0 ends the body too, so the same follower is a
document paragraph.

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
  <dd>x</dd>
</dl>
<p>more</p>
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
which the closed body does not take back.

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
  <dd>x</dd>
</dl>
<p>more</p>
```

:::
