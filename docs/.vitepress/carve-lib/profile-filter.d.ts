import type { Document, Text } from './ast.js';
import { Profile, type ProfileViolation } from './profile.js';
/** Result of a profile transform. */
export interface ProfileFilterResult {
    doc: Document;
    violations: ProfileViolation[];
}
/**
 * Apply a profile to a resolved Document, returning the filtered document and
 * any violations. The input document is mutated in place (callers that need
 * the original should clone first); this mirrors carve-php's filter().
 */
export declare function applyProfile(doc: Document, profile: Profile, baseHost?: string | null): ProfileFilterResult;
export type { Text };
//# sourceMappingURL=profile-filter.d.ts.map