## A comment fence is a comment at any column too

§24 C3 recognizes a comment at any column, and that covers the fence form as well as the `%%` line: an indented `%%%` opener below an item's content column stays invisible, along with the body it encloses. Rendering the opener as text would put the comment on the page, which is what the rule exists to prevent.

::: compare

```carve
- a
 %%% n
 x
 %%%
 tail
```

```html
<ul>
  <li>a</li>
</ul>
<p>tail</p>
```

:::
