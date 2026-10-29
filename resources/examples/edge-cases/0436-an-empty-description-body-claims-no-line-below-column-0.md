## An empty description body claims no line below column 0

`CONTINUATION-MARKER REACHES ITS OWN COLUMN` (§17 L3,
markup-carve/carve#3421) says a line
the `+` does not reach follows the ordinary column rules, which a
comment line cannot reach either - so the comment spelling is this section's
control. In the
accepted wider-separator FIRST-BLOCK form `:  +` no paragraph is open, so the
`+` genuinely is a marker
and the clause reads its payload's column - and a payload at column 1 or 2 is
not at the opener's marker column, so the marker is refused and the body ends where the comment
ends it. It did not: the description reached out and put the payload in the
`dd`, at both columns, while the comment spelling of the same document left it
outside (markup-carve/carve#1821). Each pair below is one document twice, once
with the marker and once with its control.

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

The marker answers the same, where it used to claim the line.

::: compare

```carve
:: t
:  +
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
  <dd></dd>
</dl>
<p>flush</p>
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

The LIST ITEM is the reference. It already answered the band this way, in both
spellings, which is what made the description's answer a divergence rather than
a rule.

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
  <li></li>
</ul>
<p>flush</p>
```

:::
