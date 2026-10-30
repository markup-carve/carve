## A refused description plus folds a line below column 0, and a comment does not

`:  +` attaches only a follower at the description's marker column, column 0
(§17 L3, carve#4409). At column 1 or 2 it is refused and is a letter, so the line
folds into the paragraph it opens. A comment in the same place opens no paragraph
and leaves the line outside. Each pair below is one document twice, once with the
marker and once with its control.

The payload one column in. The comment spelling ends the body, and the `dd` it
leaves is empty because a comment renders nothing.

::: compare

```carve
:: t
:  %% c
 flush
```

```html
<dl>
  <dt>t</dt>
  <dd></dd>
</dl>
<p>flush</p>
```

:::

The marker is refused, and the line folds into the `+` in the `dd`.

::: compare

```carve
:: t
:  +
 flush
```

```html
<dl>
  <dt>t</dt>
  <dd>+
flush</dd>
</dl>
```

:::

Column 2 is the last column below the body's own content column, and it is
refused for the same reason - the marker names ONE column, not a range reaching
down to the container's floor.

::: compare

```carve
:: t
:  %% c
  flush
```

```html
<dl>
  <dt>t</dt>
  <dd></dd>
</dl>
<p>flush</p>
```

:::

::: compare

```carve
:: t
:  +
  flush
```

```html
<dl>
  <dt>t</dt>
  <dd>+
flush</dd>
</dl>
```

:::

The positive half. At column 0 the marker is not refused, and the first-block
form keeps the one flush-left block it names - so a rule that refused
everything would not satisfy this row.

::: compare

```carve
:: t
:  +
flush
```

```html
<dl>
  <dt>t</dt>
  <dd>flush</dd>
</dl>
```

:::

A list item reads the same in both spellings: the comment leaves the line
outside, and the refused `+` folds it in.

::: compare

```carve
- %% c
 flush
```

```html
<ul>
  <li></li>
</ul>
<p>flush</p>
```

:::

::: compare

```carve
- +
 flush
```

```html
<ul>
  <li>+
flush</li>
</ul>
```

:::
