import { getTableColumns } from "drizzle-orm";

import { invoices } from "../schema";

// packages/db/src/seed/_debug.ts

console.debug("invoices columns:", Object.keys(getTableColumns(invoices)));
console.debug(
  "has invoiceNumber:",
  "invoiceNumber" in getTableColumns(invoices)
);
