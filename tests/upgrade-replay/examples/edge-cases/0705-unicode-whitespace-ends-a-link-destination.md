## Unicode whitespace ends a link destination

The gap in each rejected destination below is U+202F NARROW NO-BREAK SPACE. Ordinary spaces and a valid destination provide the controls.

:::: compare

```carve
[okref]: https://e.com/path

[t](u v) and [ok](u-v)

[r]: https://e.com /path
[text][r] and [text][okref]
```

```html
<p>[t](u v) and <a href="u-v">ok</a></p>
<p>[r]: https://e.com /path
[text][r] and <a href="https://e.com/path">text</a></p>
```

::::
