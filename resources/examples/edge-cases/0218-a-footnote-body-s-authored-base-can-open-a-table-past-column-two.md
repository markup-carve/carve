## A footnote body's authored base can open a table past column two

The body's minimum column is fixed by §16's `space, space`, not read off the first continuation line. A recognized block opener at or beyond that minimum establishes its own authored base, so these rows remain a table when written one column farther in. Canonical output returns the table to the body's minimum column.

::: compare

```carve
[^a]: intro

   | a |
   | - |
   | b |

see[^a]
```

```html
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>intro</p>
      <table>
        <thead>
          <tr><th scope="col">a</th></tr>
        </thead>
        <tbody>
          <tr><td>b</td></tr>
        </tbody>
      </table>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::
