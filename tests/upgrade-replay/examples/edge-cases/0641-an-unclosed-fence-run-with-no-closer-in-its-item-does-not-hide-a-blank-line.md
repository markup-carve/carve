## An unclosed fence run with no closer in its item does not hide a blank line

These rows follow up the folded fence run section (carve#3495). A fence line with no closer inside its item opens a code block (PART 9 §10 I4), so a blank line after it is payload and leaves the list tight. A line below the item column ends the fence and the item, whether it is a closer-shaped line or a letter.

A closer-shaped line below the item column ends the item and opens a fence of its own

::::::: compare

`````carve
- h
  ```

  b
```
`````

`````html
<ul>
  <li>h
    <pre><code>
b
</code></pre>
  </li>
</ul>
<pre><code></code></pre>
`````

:::::::

A letter below the item column ends the item the same way

::::::: compare

`````carve
- o
  ```
x

  t
`````

`````html
<ul>
  <li>o
    <pre><code></code></pre>
  </li>
</ul>
<p>x</p>
<p>t</p>
`````

:::::::
