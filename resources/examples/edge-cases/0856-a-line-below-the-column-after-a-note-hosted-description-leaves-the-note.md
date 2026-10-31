---
page: edge-lists
---

## A line below the column after a note-hosted description leaves the note

A description marker line that holds no paragraph gives the line no lazy host (CARVE-P9-083, CARVE-P0-024, carve#4498).

::: compare

````carve
[^f]: :: t
  : | a |
 ^ cap

[^f]
````

```html
<p>^ cap</p>
<p><a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <dl>
        <dt>t</dt>
        <dd>
          <table>
            <tbody>
              <tr><td>a</td></tr>
            </tbody>
          </table>
        </dd>
      </dl>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

::: compare

````carve
[^f]: :: t
  : # h
b

[^f]
````

```html
<p>b</p>
<p><a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <dl>
        <dt>t</dt>
        <dd>
          <h1 id="h">h</h1>
        </dd>
      </dl>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::
