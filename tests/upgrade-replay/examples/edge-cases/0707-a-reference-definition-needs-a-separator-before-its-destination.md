## A reference definition needs a separator before its destination

The missing space after `[a]:` leaves that line as prose. The definition with a space still resolves.

:::: compare

```carve
[b]: /v

[a]:/u
[a][] and [b][]
```

```html
<p>[a]:/u
[a][] and <a href="/v">b</a></p>
```

::::
