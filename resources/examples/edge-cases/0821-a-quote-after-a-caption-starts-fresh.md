---
page: edge-lists
---

## A quote after a caption starts fresh

A `^ ` caption after a block quote attaches to the quote and ends it; it is never a lazy line of the quote's open paragraph (CARVE-P2-008, carve#4312). A quote after the caption is a new quote and reads as it would on its own, so an indented heading, footnote definition or table in it opens where it stands (PART 0 S3), and a column-0 line after a heading or a table is not lazy.

::::::: compare

````carve
> - t
^ p
>   # h
l
````

````html
<figure>
  <blockquote>
    <ul>
      <li>t</li>
    </ul>
  </blockquote>
  <figcaption>p</figcaption>
</figure>
<blockquote>
  <h1 id="h">h</h1>
</blockquote>
<p>l</p>
````

:::::::

::::::: compare

````carve
> - t
^ p
>   [^f]: n
l

r[^f]
````

````html
<figure>
  <blockquote>
    <ul>
      <li>t</li>
    </ul>
  </blockquote>
  <figcaption>p</figcaption>
</figure>
<blockquote>

</blockquote>
<p>r<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>n
l<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
````

:::::::

::::::: compare

````carve
> 1. t
^ p
>   ||
l
````

````html
<figure>
  <blockquote>
    <ol>
      <li>t</li>
    </ol>
  </blockquote>
  <figcaption>p</figcaption>
</figure>
<blockquote>
  <table>
    <tbody>
      <tr><td></td></tr>
    </tbody>
  </table>
</blockquote>
<p>l</p>
````

:::::::
