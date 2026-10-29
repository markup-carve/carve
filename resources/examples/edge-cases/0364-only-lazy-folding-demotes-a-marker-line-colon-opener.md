## Only lazy folding demotes a marker-line colon opener

A `:::` opener written as the sole content of a list item's marker line opens a
container, whatever the next line is (PART 2, "A MARKER-LINE OPENER OPENS TOO",
ruled on markup-carve/carve#2978). No later line takes that away. An earlier
reading demoted the opener to text when its whole body arrived by lazy folding;
the section keeps that title. An opener a blank follows has opened an EMPTY
container (carve#1382).

::: compare

```carve
- ::: d

tail
```

```html
<ul>
  <li>
    <div class="d">

    </div>
  </li>
</ul>
<p>tail</p>
```

:::

The line below the content column. The opener has opened an empty container,
which holds no paragraph, so `tail` has nothing to fold into and is a document
paragraph (`CARVE-P0-009`, `CARVE-P9-084`).

::: compare

```carve
- ::: d
tail

after
```

```html
<ul>
  <li>
    <div class="d">

    </div>
  </li>
</ul>
<p>tail</p>
<p>after</p>
```

:::
