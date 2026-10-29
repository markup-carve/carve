## A block image is separated from the block after it on every target

A lone image is a BLOCK, so whatever separates two blocks on a target separates this one from what follows. The corpus held no document where a block image is followed by another block, so no gate compared the engines on it - and one of them ran the alt text straight into the next paragraph on the plain and ANSI targets (`alt textfollowing paragraph`), which the two repos claiming non-HTML parity could not catch because each reads its own committed snapshot rather than the other engines (carve-rs#692, carve-js#762).

::: compare

```carve
![alt text](img.png)

following paragraph
```

```html
<img src="img.png" alt="alt text">
<p>following paragraph</p>
```

:::
