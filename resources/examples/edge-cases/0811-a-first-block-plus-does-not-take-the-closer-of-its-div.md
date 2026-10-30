---
page: edge-lists
---

## A first-block plus does not take the closer of its div

A div's closer belongs to the div and is never a block of its body, so a first-block `+` before it is refused: the item or description holds the letter `+` and the div closes there (PART 9 §12, carve#4254, carve#4409). The same holds for a `+` nested in an item or a description body and for a quote's `+`.

::::::: compare

````carve
::: d
- d
  - +
:::
after
````

````html
<div class="d">
  <ul>
    <li>d
      <ul>
        <li>+</li>
      </ul>
    </li>
  </ul>
</div>
<p>after</p>
````

:::::::

::::::: compare

````carve
::: d
:: t
: d
  :: u
  : +
:::
after
````

````html
<div class="d">
  <dl>
    <dt>t</dt>
    <dd>
      <p>d</p>
      <dl>
        <dt>u</dt>
        <dd>+</dd>
      </dl>
    </dd>
  </dl>
</div>
<p>after</p>
````

:::::::

::::::: compare

````carve
::: d
- +
:::
after
````

````html
<div class="d">
  <ul>
    <li>+</li>
  </ul>
</div>
<p>after</p>
````

:::::::

::::::: compare

````carve
::: d
- d

  > +
:::
after
````

````html
<div class="d">
  <ul>
    <li>d
      <blockquote><p>+</p></blockquote>
    </li>
  </ul>
</div>
<p>after</p>
````

:::::::
