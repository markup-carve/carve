---
page: edge-attributes
---

## A title on the attribute line beats a fence header title

CARVE-P2-005 and PART 10 §1 (carve#4544). A code fence's header title is sugar for a title the block-attribute line above did not set, so a `title` on that line wins over the header instead of the header taking the last value.

:::::: compare

`````carve
{title="outer"}
```js "inner"
x
```
`````

```html
<pre title="outer"><code class="language-js">x
</code></pre>
```

::::::
