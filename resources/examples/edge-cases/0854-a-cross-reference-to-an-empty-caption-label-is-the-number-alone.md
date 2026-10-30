---
page: edge-links
---

## A cross-reference to an empty caption label is the number alone

PART 9R R4 (carve#4461).

:::: compare

````carve
{#t}
| a |
^ # x

</#t>
````

```html
<table id="t">
  <caption>1 x</caption>
  <tbody>
    <tr><td>a</td></tr>
  </tbody>
</table>
<p><a href="#t">1</a></p>
```

::::
