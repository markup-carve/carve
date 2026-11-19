## A denied destination takes one render-loss row per sink

Blanking a denied destination is a render loss with a report code of its own,
`destination-denied` (normative: grammar PART 9 §25). A document with a denied
link and a denied image blanks both and owes one row for each, so the pair
below is the authored input for the two-row case; the HTML shows only what is
blanked.

::: compare no-render

```carve
[report me](javascript:one) and ![report me too](vbscript:two)
```

```html
<p><a href="">report me</a> and <img src="" alt="report me too"></p>
```

:::
