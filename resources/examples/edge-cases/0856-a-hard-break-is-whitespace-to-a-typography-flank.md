---
page: edge-inline
---

## A hard break is whitespace to a typography flank

A quote after a dash closes before a hard break, as it does before a soft break.

::: compare

```carve
"a-"\
b
```

```html
<p>“a-”<br>
b</p>
```

:::

A dash run before a hard break is not a flag.

::: compare

```carve
x --\
y
```

```html
<p>x –<br>
y</p>
```

:::

An escaped space reads the same way, for a dash run and for a quote.

::: compare

```carve
x --\ y
```

```html
<p>x –&nbsp;y</p>
```

:::

::: compare

```carve
"a-"\ b
```

```html
<p>“a-”&nbsp;b</p>
```

:::

A slash closes a quote the same way, and so does a single quote.

::: compare

```carve
'a/'\
b
```

```html
<p>‘a/’<br>
b</p>
```

:::

An escaped backslash is a character, not a break: the quote opens.

::: compare

```carve
"a-"\\ b
```

```html
<p>“a-“\ b</p>
```

:::
