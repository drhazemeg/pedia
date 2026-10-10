import { createTableHookContexts } from "@tanstack/react-table";

import type { features } from "./features";

/**
 * Scoped contexts created independently of the component registrations in
 * table.ts. Components import their context hooks from here so that
 * table.ts → component → table.ts cycles are broken.
 *
 * The hooks here lack the rich `tableComponents`/`cellComponents`/
 * `headerComponents` types that the hooks returned by `createTableHook` carry,
 * but they are functionally identical at runtime because we pass the same
 * context objects into `createTableHook` in table.ts.
 */
export const {
  tableContext,
  cellContext,
  headerContext,
  useTableContext,
  useCellContext,
  useHeaderContext,
} = createTableHookContexts<typeof features>();
