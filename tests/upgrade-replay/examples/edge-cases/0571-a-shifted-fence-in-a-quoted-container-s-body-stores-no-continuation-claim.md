## A shifted fence in a quoted container's body stores no continuation claim

A fence that opens past a quoted container’s body column leaves no paragraph
for an unmarked line to continue (`CARVE-P0-013`, `CARVE-P0-006`).

::: compare

````carve
> - ::: box
>    ```
>    code
tail
````

```html
<blockquote>
  <ul>
    <li>
      <div class="box">
        <pre><code>code
</code></pre>
      </div>
    </li>
  </ul>
</blockquote>
<p>tail</p>
```

````carve
> > - ::: box
> >   - inner
> >     %% c
> >    ```
> >    code
- tail
````

```html
<blockquote>
  <blockquote>
    <ul>
      <li>
        <div class="box">
          <ul>
            <li>inner</li>
          </ul>
          <pre><code>code
</code></pre>
        </div>
      </li>
    </ul>
  </blockquote>
</blockquote>
<ul>
  <li>tail</li>
</ul>
```

:::
