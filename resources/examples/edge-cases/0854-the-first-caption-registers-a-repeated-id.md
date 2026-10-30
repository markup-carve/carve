---
page: edge-attributes
---

## The first caption registers a repeated id

PART 9R R5: the first registration in document order wins, and the later caption stays numbered (carve#4455).

:::: compare

````carve
{#t}
| a |
^ A #: x

{#t}
| b |
^ A #: y

</#t>
````

```html
<table id="t">
  <caption>A 1: x</caption>
  <tbody>
    <tr><td>a</td></tr>
  </tbody>
</table>
<table id="t">
  <caption>A 2: y</caption>
  <tbody>
    <tr><td>b</td></tr>
  </tbody>
</table>
<p><a href="#t">A 1</a></p>
```

::::
