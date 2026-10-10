// packages/ui/src/components/auto-form/fields/array.tsx
//
// Backwards-compatibility shim. The array renderer lives in `object.tsx`
// alongside `AutoFormObject` — they're mutually recursive, so keeping them
// in the same module is what breaks the import cycle that previously ran
// `object → array → object`.
//
// Existing call sites that `import AutoFormArray from "./array"` keep
// working; new call sites should import from `./object` directly.
//
// Delete this file once every import has been migrated.

import { AutoFormArray } from "./object";

export type { ArrayFieldConfig } from "./object";
export default AutoFormArray;
