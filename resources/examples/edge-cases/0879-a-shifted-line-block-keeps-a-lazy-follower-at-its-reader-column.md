---
page: edge-lists
---

## A shifted line block keeps a lazy follower at its reader column

PART 0 S4 (carve#4678). A lazy line below the authored content column keeps no indentation in the line block's frame after that frame is moved to the reader's column.

::: compare

````carve
[^f]: :: t
    - ::: |
      a
     b

[^f]
````

````html
<p><a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <dl>
        <dt>t</dt>
      </dl>
      <ul>
        <li>
          <div class="line-block">
            <p>a<br>
b</p>
          </div>
        </li>
      </ul>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
````

:::
