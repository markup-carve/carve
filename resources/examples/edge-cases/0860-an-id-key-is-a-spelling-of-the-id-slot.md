---
page: edge-attributes
---

## An id key is a spelling of the id slot

The key goes where `{#x}` goes, on a heading's section, and a cross-reference finds it.

::: compare

```carve
{id="x"}
# H

</#x>
```

```html
<section id="x">
  <h1>H</h1>
  <p><a href="#x">H</a></p>
</section>
```

:::

The two spellings share one slot, and the last one written wins.

::: compare

```carve
{#a id="b"}
p
```

```html
<p id="b">p</p>
```

:::

No carrier probes it.

::: compare

```carve
*x*{id="data:y"}
```

```html
<p><strong id="data:y">x</strong></p>
```

:::

::: compare

```carve
|{id="file:y"} x |
```

```html
<table>
  <tbody>
    <tr><td id="file:y">x</td></tr>
  </tbody>
</table>
```

:::

The key reaches past an explicit identifier, so the value is escaped in the `id` and in the `href`.

::: compare

```carve
{id='a"b&c'}
# H

</#a"b&c>
```

```html
<section id="a&quot;b&amp;c">
  <h1>H</h1>
  <p><a href="#a&quot;b&amp;c">H</a></p>
</section>
```

:::
