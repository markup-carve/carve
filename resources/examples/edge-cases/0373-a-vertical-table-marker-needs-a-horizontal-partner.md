## A vertical table marker needs a horizontal partner

Horizontal alignment may stand alone. Vertical alignment is meaningful only as
the second axis of a paired run, so a lone `^` or `v` stays visible instead of
silently changing layout. Axes are always written horizontal then vertical;
vertical-first runs stay visible rather than switching the order. A rejected run
takes the kind marker with it (T11): only the paired cell keeps its `=`, and the
rest read as data cells whose text begins with `=`.

::: compare

```carve
|=^ Top |=v Bottom |=<^ Paired |=v> Reverse |=~> Middle |
| a | b | c | d | e |
```

```html
<table>
  <tbody>
    <tr><td>=^ Top</td><td>=v Bottom</td><th scope="row" style="text-align: left; vertical-align: top;">Paired</th><td>=v&gt; Reverse</td><td>=~&gt; Middle</td></tr>
    <tr><td>a</td><td>b</td><td>c</td><td>d</td><td>e</td></tr>
  </tbody>
</table>
```

:::
