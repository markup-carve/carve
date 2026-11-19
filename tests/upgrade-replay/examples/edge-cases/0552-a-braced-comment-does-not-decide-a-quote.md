## A braced comment does not decide a quote

Which half of a pair a `"` or `'` resolves to follows the character that
precedes it in the rendered text, so a construct contributing no character
decides nothing. A braced comment renders nothing at all, which makes it the
construct this is reachable through: inserting one must not flip an opening
quote into a closing one (`CARVE-P3-023`, markup-carve/carve#2861).

A quote after `{` opens, and an empty comment between the two changes neither
the rendered text nor the direction.

::: compare

```carve
\{"q"
```

```html
<p>{“q”</p>
```

```carve
\{{%%}"q"
```

```html
<p>{“q”</p>
```

:::

A comment at the start of the input leaves the quote at the start of the
rendered text, and a comment after a space leaves the space.

::: compare

```carve
{%%}"q"
```

```html
<p>“q”</p>
```

```carve
x {% hidden %}"q"
```

```html
<p>x “q”</p>
```

:::

Content before the comment still decides the quote. An attribute block carries no character of its own either,
but the content it attaches to does.

::: compare

```carve
a{%%}"q"
```

```html
<p>a”q”</p>
```

```carve
[x]{.c}{%%}"q"
```

```html
<p><span class="c">x</span>”q”</p>
```

:::

A single quote takes the same rule.

::: compare

```carve
\{{%%}'q'
```

```html
<p>{‘q’</p>
```

:::
