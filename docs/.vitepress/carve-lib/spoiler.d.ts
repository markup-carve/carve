import type { CarveExtension } from './extension.js';
/**
 * Hidden / blurred "spoiler" content, revealed on interaction. Tier-3, the
 * standard `spoiler` extension from the spec's Extension Registry.
 *
 * - **Inline** `:spoiler[text]` → `<span class="spoiler">text</span>`. The
 *   blur + reveal is the host's CSS/JS (Carve only emits the marker, like
 *   Mermaid); see the docs for a reference accessible stylesheet.
 *
 * - **Block** `::: spoiler "Title"` → an HTML5 `<details class="spoiler">`
 *   disclosure (native, keyboard- and screen-reader-accessible). A title-less
 *   block falls back to `<summary>Spoiler</summary>` so the widget always has
 *   a label.
 *
 *       Plot: :spoiler[the butler did it].
 *
 *       ::: spoiler "Ending"
 *       Everyone lives.
 *       :::
 *
 * Without the extension, `:spoiler[x]` stays the generic `<span class="ext-spoiler">x</span>`
 * and `::: spoiler` stays a plain `<div class="spoiler">`, so documents remain
 * readable. Author attributes on either form merge onto the output element and
 * are hardened (event handlers / `srcdoc` / `formaction` stripped, dangerous
 * values neutralized) by the shared `renderAttrs`.
 */
export declare function spoiler(): CarveExtension;
//# sourceMappingURL=spoiler.d.ts.map