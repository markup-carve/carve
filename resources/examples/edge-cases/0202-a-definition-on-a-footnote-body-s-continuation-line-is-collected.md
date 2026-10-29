## A definition on a footnote body's continuation line is collected

A footnote body is a container like any other, and §16 collects a definition out of a container. On the body's own continuation column the line defines, renders nothing, and the reference below the note resolves. carve-rs rendered it as note text until carve-rs#599; nothing in the corpus held the other two to it.

::: compare

```carve
[^a]: note
  [r]: /u

see[^a] and [t][r]
```

```html
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a> and <a href="/u">t</a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>note<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::
