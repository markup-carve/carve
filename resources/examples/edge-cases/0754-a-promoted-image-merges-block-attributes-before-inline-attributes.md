## A promoted image merges block attributes before inline attributes

:::: compare

```carve
{.outer k=one}
![a](b){.inner k=two}
```

```html
<img src="b" alt="a" class="outer inner" k="two">
```

::::
