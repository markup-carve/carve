---
page: edge-lists
---

## A skipped note definition cannot claim an earlier plus

A footnote definition at the host's marker column stays in that host. Its own `+` cannot claim the block already offered to an earlier `+` (CARVE-P9-067 L3).

:::: compare

```carve
[^a]: +
[^a]: +
- b

[^a]
```

```html
<p><a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <ul>
        <li>b</li>
      </ul>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

::::
