import type { CarveExtension } from './extension.js';
/**
 * Inline color swatch. Tier-3, the standard `color` extension from the spec's
 * Extension Registry.
 *
 * `:color[value]` renders a small color chip and the color value when the value
 * is a safe CSS color (hex, rgb()/hsl(), or an actual CSS named color). Unknown
 * / invalid values defer to the generic extension fallback
 * (`<span class="ext-color">...`).
 *
 * The render is configurable:
 * - `position`: chip `before` the value (default), `after` it, or `none` (chip
 *   only; the value becomes the element `title`).
 * - `shape`: a filled `square` (default), filled `round` dot, or hollow `ring`
 *   (the color is the chip border, not its fill).
 * - `tint`: paint a faint `color-mix()` tint of the color behind the swatch.
 * - `reveal`: collapse the value text and reveal it on hover / keyboard focus
 *   (pure-CSS, driven by the `swatch-reveal` class). The value stays in the DOM
 *   for assistive tech. Ignored when `position` is `none` (already hidden).
 */
export type SwatchPosition = 'before' | 'after' | 'none';
export type SwatchShape = 'square' | 'round' | 'ring';
export interface ColorSwatchOptions {
    position?: SwatchPosition;
    shape?: SwatchShape;
    tint?: boolean;
    reveal?: boolean;
}
export declare function colorSwatch(options?: ColorSwatchOptions): CarveExtension;
//# sourceMappingURL=color-swatch.d.ts.map