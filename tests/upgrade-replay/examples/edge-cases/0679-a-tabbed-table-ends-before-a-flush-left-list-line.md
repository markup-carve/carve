## A tabbed table ends before a flush-left list line

The table belongs to the item, and the next line falls below its content column.

::: compare

```carve
- a
	|x|
+ c
```

```html
<ul>
  <li>a
    <table>
      <tbody>
        <tr><td>x</td></tr>
      </tbody>
    </table>
  </li>
</ul>
<p>+ c</p>
```

:::
