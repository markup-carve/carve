## An invalid attribute block leaves a definition as prose

A trailing `{#}` is not an attribute block. A valid definition above it still resolves and carries its class.

:::: compare

```carve
[b]: /v {.ok}

[a]: /u {#}
[a][] and [b][]
```

```html
<p>[a]: /u {#}
[a][] and <a href="/v" class="ok">b</a></p>
```

::::
