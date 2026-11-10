---
page: edge-lists
---

## An item marker-line brace run measures from its written brace

On an item's marker line, an attribute or comment run measures its opening brace where it is written: extra separator spaces and a task box before it keep their width, so a continuation must stand past the written brace (CARVE-P2-035, carve#5805).

::: compare

```carve
-   {.x
   }
   z
```

```html
<ul>
  <li>{.x
}
z</li>
</ul>
```

:::

::: compare

```carve
-   {.x
     }
     z
```

```html
<ul>
  <li><p class="x">z</p></li>
</ul>
```

:::

::: compare

```carve
- [ ] {.x
   }
   z
```

```html
<ul class="task-list">
  <li><input type="checkbox" disabled aria-label="{.x } z"> {.x
}
z</li>
</ul>
```

:::

::: compare

```carve
- [ ] {.x
       }
       z
```

```html
<ul class="task-list">
  <li><input type="checkbox" disabled aria-label="z"> <p class="x">z</p></li>
</ul>
```

:::
