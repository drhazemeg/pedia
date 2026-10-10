// src/db/utils/index.ts
export * from "./id";
export * from "./pedia";
export * from "./vaccineMilestones";
export * from "./who";

// Add readCount utility
export function readCount(
  rows: Array<{ count: number | string }> | undefined
): number {
  return Number(rows?.[0]?.count ?? 0);
}
