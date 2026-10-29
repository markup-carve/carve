## Any character is content of the combined bold-italic token

`bi_content` is the content every other emphasis kind has, so a tab, a
character outside the grammar's named classes, an escaped space, a hard break
or a braced comment inside `/*...*/` leaves the combined token whole
(markup-carve/carve#2159). The first document holds a tab between the letters.

::: compare

```carve
/*a	b*/ y
```

```html
<p><strong><em>a	b</em></strong> y</p>
```

:::

Characters no other content rule names.

::: compare

```carve
/*a<b*/ y

/*a # b*/ y

/*a{b}c*/ y

/*a€b*/ y

/*a b*/ y
```

```html
<p><strong><em>a&lt;b</em></strong> y</p>
<p><strong><em>a # b</em></strong> y</p>
<p><strong><em>a{b}c</em></strong> y</p>
<p><strong><em>a€b</em></strong> y</p>
<p><strong><em>a&nbsp;b</em></strong> y</p>
```

:::

An escaped space is a no-break space.

::: compare

```carve
/*a\ b*/ y
```

```html
<p><strong><em>a&nbsp;b</em></strong> y</p>
```

:::

A backslash at the end of a line is a hard break.

::: compare

```carve
/*a\
b*/ y
```

```html
<p><strong><em>a<br>
b</em></strong> y</p>
```

:::

A braced comment renders nothing.

::: compare

```carve
/*a{%c%}b*/ y
```

```html
<p><strong><em>ab</em></strong> y</p>
```

:::

CONTROL. A tab before the closer is refused like a space, so the token falls
through to an italic around literal asterisks. The third character is a tab.

::: compare

```carve
/*a	*/ y
```

```html
<p><em>*a	*</em> y</p>
```

:::

A `%%` comment runs to the end of its line, and the token closes on the next.

::: compare

```carve
/*a %%c
b*/ y
```

```html
<p><strong><em>a
b</em></strong> y</p>
```

:::
