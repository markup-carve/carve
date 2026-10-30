---
page: edge-tables
---

## A caption bucket key keeps a symbol and drops a comment

A caption label's counter bucket key is its plain text: a symbol contributes what the caption shows for it, so `Fig :smile:` and `Fig` count apart, and an editorial comment contributes nothing, so `Fig {#c#}` counts with `Fig` (CARVE-P2-022, carve#4111).

::: compare

```carve
||
^ Fig :smile: #: a

||
^ Fig #: b
```

```html
<table>
  <caption>Fig :smile: 1: a</caption>
  <tbody>
    <tr><td></td></tr>
  </tbody>
</table>
<table>
  <caption>Fig 1: b</caption>
  <tbody>
    <tr><td></td></tr>
  </tbody>
</table>
```

:::

::: compare

```carve
||
^ Fig #: a

||
^ Fig {#c#} #: b
```

```html
<table>
  <caption>Fig 1: a</caption>
  <tbody>
    <tr><td></td></tr>
  </tbody>
</table>
<table>
  <caption>Fig <span class="critic-comment">c</span> 2: b</caption>
  <tbody>
    <tr><td></td></tr>
  </tbody>
</table>
```

:::
