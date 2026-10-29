## An unterminated raw fence keeps literal payload termination

An unclosed raw fence retains its payload through EOF. The matching HTML
adapter preserves ordinary output; other raw formats emit no HTML.

::: compare

````carve
```=html
<b>raw</b>
````

```html
<b>raw</b>
```

:::

::: compare

````carve
before

```=latex
x
````

```html
<p>before</p>
```

:::

::: compare

````carve
before

```=markdown
x
````

```html
<p>before</p>
```

:::
