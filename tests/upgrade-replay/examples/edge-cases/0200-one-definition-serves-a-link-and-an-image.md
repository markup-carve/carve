## One definition serves a link and an image

The definition table is shared, so the same label resolves for both - once as a destination, once as a source.

::: compare

```carve
See [text][m] and ![moon][m].

[m]: /moon.png
```

```html
<p>See <a href="/moon.png">text</a> and <img src="/moon.png" alt="moon">.</p>
```

:::
