## A quote after a bare delimiter follows what that delimiter does

A smart quote takes its side from the character before it (PART 3). A
delimiter that opens a span puts the quote at the start of that span's
content, which opens the quote; a delimiter that opens nothing is the
preceding character, and none of `*`, `_` and `~` is an opening context
(markup-carve/carve#2164).

::: compare

```carve
*"x"

a *"x" b

a **"x" b
```

```html
<p>*”x”</p>
<p>a *”x” b</p>
<p>a **”x” b</p>
```

:::

CONTROL. The same delimiters where they do open a span.

::: compare

```carve
a *"x"* b

a ~*"x"* b
```

```html
<p>a <strong>“x”</strong> b</p>
<p>a ~<strong>“x”</strong> b</p>
```

:::

What stands before the opener does not reach the quote.

::: compare

```carve
a.*"x"* b

a,_"x"_ b
```

```html
<p>a.<strong>“x”</strong> b</p>
<p>a,<u>“x”</u> b</p>
```

:::

A forced span's own delimiter opens it, so a quote at its content start opens.

::: compare

```carve
x{*"y"*}
```

```html
<p>x<strong>“y”</strong></p>
```

:::

Inside it that delimiter is literal, and a quote after one closes.

::: compare

```carve
{*a *"x"*}
```

```html
<p><strong>a *”x”</strong></p>
```

:::

A quote after a closed one follows the glyph that one took.

::: compare

```carve
*"'x'
```

```html
<p>*”’x’</p>
```

:::

CONTROL. An intraword delimiter opens nothing, and `/` and `=` are opening
characters in their own right.

::: compare

```carve
a*"x"* b

/"x"

="x"
```

```html
<p>a*”x”* b</p>
<p>/“x”</p>
<p>=“x”</p>
```

:::
