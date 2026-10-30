---
page: edge-lists
---

## A lazy line into a descendant's paragraph keeps the descendant the deepest frame

A lazy line that folds into a nested item's paragraph leaves that item the deepest frame. A block that then closes the nested paragraph (a table, a heading, a definition) leaves no paragraph open, so a column-0 line after it is not lazy and starts a new block. This holds wherever the lazy line stands below the nested item's content column, and when the nested list sits in a quote on the item's marker line (PART 0 S4, CARVE-P0-006, carve#4291).

::::::: compare

````carve
- a
  - b
  c
    ||
y
````

````html
<ul>
  <li>a
    <ul>
      <li>b
c
        <table>
          <tbody>
            <tr><td></td></tr>
          </tbody>
        </table>
      </li>
    </ul>
  </li>
</ul>
<p>y</p>
````

:::::::

::::::: compare

````carve
- > - a
g
  >   # h
l
````

````html
<ul>
  <li>
    <blockquote>
      <ul>
        <li>a
g
          <h1 id="h">h</h1>
        </li>
      </ul>
    </blockquote>
  </li>
</ul>
<p>l</p>
````

:::::::

::::::: compare

````carve
1. a
   - b
   c
     [r]: /u
y
````

````html
<ol>
  <li>a
    <ul>
      <li>b
c</li>
    </ul>
  </li>
</ol>
<p>y</p>
````

:::::::

::::::: compare

````carve
- - a
   c
    # h
z
````

````html
<ul>
  <li>
    <ul>
      <li>a
c
        <h1 id="h">h</h1>
      </li>
    </ul>
  </li>
</ul>
<p>z</p>
````

:::::::
