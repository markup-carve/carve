---
page: edge-comments
---

## A quoted comment span uses its live owner

PART 0 S1 (CARVE-P0-005). A line that misses a span's item ends that span. The later unmarked delimiter opens a new span in the document and keeps all following lines as payload.

::: compare

```carve
> - %%%%
> x
%%%%

z
```

```html
<blockquote>
  <ul>
    <li></li>
  </ul>
  <p>x</p>
</blockquote>
```

:::

An unmarked comment-shaped line is payload while a quote-owned span remains open. Its exact closer ends that span, leaving one quote. The decision trace pins this case in the direct regression test.

```carve
> %%%
%%
> %%%
z
```

```html
<blockquote>

</blockquote>
<p>z</p>
```
