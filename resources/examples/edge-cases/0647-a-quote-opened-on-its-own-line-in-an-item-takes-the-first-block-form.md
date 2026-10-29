## A quote opened on its own line in an item takes the first-block form

A `> +` that opens a quote on its own line inside a list item attaches the following block at the quote's column to that quote, as it would for a quote opened at the start of a document. An item's content is read like a document, so the first-block form of CARVE-P9-067 covers a quote opened there (carve#3421).

The ruled shape

::::::: compare

`````carve
- a
  > +
  q
`````

`````html
<ul>
  <li>a
    <blockquote><p>q</p></blockquote>
  </li>
</ul>
`````

:::::::

A nested item in an ordered list, with a table as the attached block

::::::: compare

`````carve
1. a
   - b
     > +
     | c |
`````

`````html
<ol>
  <li>a
    <ul>
      <li>b
        <blockquote>
          <table>
            <tbody>
              <tr><td>c</td></tr>
            </tbody>
          </table>
        </blockquote>
      </li>
    </ul>
  </li>
</ol>
`````

:::::::
