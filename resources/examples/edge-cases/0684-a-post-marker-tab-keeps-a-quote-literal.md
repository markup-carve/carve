## A post-marker tab keeps a quote literal

A tab after a list marker separator is content and cannot expose a quote opener.

::: compare

```carve
- 	> a
```

```html
<ul>
  <li>	&gt; a</li>
</ul>
```

:::
