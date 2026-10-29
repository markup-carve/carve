## A quote at the start of a span opens

The start of an inline span's content is start-of-content for quote direction, for every span kind. A quote after a closed span still closes.

::: compare

```carve
x.="q"=
```

```html
<p>x.<mark>“q”</mark></p>
```

:::

::: compare

```carve
x.*"q"* and x./'q'/
```

```html
<p>x.<strong>“q”</strong> and x.<em>‘q’</em></p>
```

:::

::: compare

```carve
x.*/"q"/* and x.{^"q"^}
```

```html
<p>x.<strong><em>“q”</em></strong> and x.<sup>“q”</sup></p>
```

:::

::: compare

```carve
*a*"q" and x="q"
```

```html
<p><strong>a</strong>”q” and x=“q”</p>
```

:::
