## A reference link's text survives its own frame

Resolving a reference is deferred: the tail is recorded when the inline pass
reaches it and matched against the definitions afterwards. Everything the link
text holds is carried across that gap, and comes out the other side unchanged -
including the constructs whose own resolution is deferred the same way.

Two of those are worth stating outright. A reference link inside link text is
still a link, so PART 3's rule that links never nest applies to it exactly as it
applies to an inline one: the inner link flattens to its text. An image
reference is not a link, so it stays, and an image inside an anchor is what the
document asked for.

::: compare

```carve
a [t</#}>][r] b

[r]: /u
```

```html
<p>a <a href="/u">t&lt;/#}&gt;</a> b</p>
```

:::

::: compare

```carve
a [t[x][r2]][r] b

[r]: /u

[r2]: /v
```

```html
<p>a <a href="/u">tx</a> b</p>
```

:::

::: compare

```carve
a [t[x][r2]](/u) b

[r2]: /v
```

```html
<p>a <a href="/u">tx</a> b</p>
```

:::

::: compare

```carve
a [t![z][r2]][r] b

[r]: /u

[r2]: /i.png
```

```html
<p>a <a href="/u">t<img src="/i.png" alt="z"></a> b</p>
```

:::
