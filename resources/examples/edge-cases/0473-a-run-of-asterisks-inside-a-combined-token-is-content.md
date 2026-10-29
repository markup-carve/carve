## A run of asterisks inside a combined token is content

`/*...*/` takes the run's first `*` as content and the last two characters as
the closer, so a three-asterisk run is a combined span over one literal `*`. The
two-asterisk `/**/` of *Bold-italic delimiter needs content* is the neighbour
where there is nothing left for content, and it stays an emphasized `**`
(markup-carve/carve#2135).

::: compare

```carve
/***/
```

```html
<p><strong><em>*</em></strong></p>
```

:::

::: compare

```carve
/****/
```

```html
<p><strong><em>**</em></strong></p>
```

:::
