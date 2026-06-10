import type { CarveExtension } from './extension.js';
/**
 * Render `::: details` admonitions as the HTML5 `<details>/<summary>`
 * disclosure element instead of the default `<div class="details">`.
 *
 * `details` is an ordinary Tier-2 custom admonition type, so by default it
 * renders as a generic `<div class="details">` (grammar PART 9 §12). This
 * Tier-3 extension opts into the native disclosure widget per the extensions
 * contract (§4.20): a collapsible block whose quoted title becomes the
 * `<summary>`.
 *
 *     ::: details "More info"
 *     Hidden until the reader expands it.
 *     :::
 *
 * renders as
 *
 *     <details>
 *       <summary>More info</summary>
 *       <p>Hidden until the reader expands it.</p>
 *     </details>
 *
 * A details block with no title gets a default `<summary>Details</summary>`
 * so the widget always has an accessible label. Block attributes on the
 * opener (`{#faq .open}`) carry onto the `<details>` tag, matching the
 * default `<div class="details">` behavior.
 *
 * Implemented as a block-node renderer (extensions contract §2.3): the inner
 * content is rendered by the core renderer at the correct nesting level, so a
 * details block behaves identically wherever it sits — top level, inside a
 * list item, inside a blockquote. The summary renders as escaped plain text
 * (inline markup in a title is flattened), and the widget needs raw-HTML
 * output, so it is inert when raw HTML is stripped.
 *
 * @example
 * carveToHtml(src, { extensions: [details()] })
 */
export declare function details(): CarveExtension;
//# sourceMappingURL=details.d.ts.map