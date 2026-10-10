// scripts/src/seed/seed-who.ts
//
// Changes:
//   - Bug 10: dedup key is now `ageDays` (integer, WHO-native), not
//     `ageMonths` (rounded float). Previously ~30 rows/month/dataset
//     were silently collapsed.
//   - Post-load validation: deduped count must equal raw count (modulo
//     genuine duplicate `Day` values, which the loader treats as an error).
//   - Schema index `who_gender_metric_age_idx` now keys on `age_days`.

import * as fs from "node:fs";
import * as path from "node:path";

import { sql } from "drizzle-orm";
import { z } from "zod";

import { closeConnection, db } from "..";
import { whoGrowthData } from "../schema";
import type { NewWhoGrowthData } from "../schema/types";
import { resolveWhoDataDir, seedLogger } from "./helper";

const logger = seedLogger("seed_who_growth");

// ------------------------------------------------------------
// Schemas
// ------------------------------------------------------------

const ExcelRowSchema = z.object({
  Day: z.number(),
  L: z.number(),
  M: z.number(),
  S: z.number(),
  SD4neg: z.number(),
  SD3neg: z.number(),
  SD2neg: z.number(),
  SD1neg: z.number(),
  SD0: z.number(),
  SD1: z.number(),
  SD2: z.number(),
  SD3: z.number(),
  SD4: z.number(),
});

type ExcelRow = z.infer<typeof ExcelRowSchema>;

// ------------------------------------------------------------
// Config
// ------------------------------------------------------------

type Gender = "male" | "female";
type MetricType = "weight" | "height";

const DATA_FILES: Record<string, { gender: Gender; type: MetricType }> = {
  "wfa-boys.json": { gender: "male", type: "weight" },
  "wfa-girls.json": { gender: "female", type: "weight" },
  "lhfa-boys.json": { gender: "male", type: "height" },
  "lhfa-girls.json": { gender: "female", type: "height" },
};

/** WHO's own month-length constant: 365.25 / 12. */
const DAYS_PER_MONTH = 30.4375;

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

function readJsonFile(filePath: string): ExcelRow[] {
  logger.set({ event: "reading_file", file: path.basename(filePath) });

  const raw = fs.readFileSync(filePath, "utf-8");
  const parsed: unknown = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error(`Expected array in ${filePath}`);
  }

  const failures: Array<{ index: number; error: z.ZodError }> = [];
  const rows: ExcelRow[] = [];

  for (let i = 0; i < parsed.length; i++) {
    const result = ExcelRowSchema.safeParse(parsed[i]);
    if (result.success) {
      rows.push(result.data);
    } else {
      failures.push({ index: i, error: result.error });
    }
  }

  logger.set({
    event: "file_parsed",
    file: path.basename(filePath),
    totalRows: parsed.length,
    validRows: rows.length,
    failedRows: failures.length,
  });

  // One malformed row is a data-authoring bug. Every row failing is a
  // schema bug. Both should stop the seed, not produce a silently
  // partial WHO table that then produces silently wrong Z-scores.
  if (failures.length > 0) {
    const first = failures[0]!;
    throw new Error(
      `seed-who: ${path.basename(filePath)} has ${failures.length} ` +
        `invalid rows (first at index ${first.index}): ${first.error.message}`
    );
  }

  if (rows.length === 0) {
    throw new Error(`seed-who: ${path.basename(filePath)} parsed to zero rows`);
  }

  return rows;
}
async function batchInsert(
  rows: NewWhoGrowthData[],
  batchSize = 1000
): Promise<number> {
  let inserted = 0;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    await db.insert(whoGrowthData).values(batch);
    inserted += batch.length;
  }

  return inserted;
}

/**
 * Build the insert payloads, keyed on `(gender, metricType, ageDays)`.
 *
 * FIXED (Bug 10): the previous key was `ageMonths`, which rounded away
 * every day-level distinction within a month. WHO LMS tables are per-day;
 * keying on `ageMonths` collapsed ~30 rows/month/dataset into one.
 *
 * Throws if two source rows share the same `Day` within a dataset — that
 * would indicate a malformed WHO file, not a legitimate dedup.
 */
function buildRows(
  data: ExcelRow[],
  gender: Gender,
  type: MetricType,
  filename: string
): NewWhoGrowthData[] {
  const byAgeDays = new Map<number, NewWhoGrowthData>();

  for (const row of data) {
    const ageMonths = Math.round((row.Day / DAYS_PER_MONTH) * 1000) / 1000;

    if (byAgeDays.has(row.Day)) {
      throw new Error(
        `seed-who: ${filename} contains duplicate Day=${row.Day}. ` +
          "WHO LMS tables must have exactly one row per (gender, metric, day)."
      );
    }

    byAgeDays.set(row.Day, {
      gender,
      metricType: type,
      ageDays: row.Day,
      ageMonths,
      L: row.L,
      M: row.M,
      S: row.S,
      sd4neg: row.SD4neg,
      sd3neg: row.SD3neg,
      sd2neg: row.SD2neg,
      sd1neg: row.SD1neg,
      sd0: row.SD0,
      sd1: row.SD1,
      sd2: row.SD2,
      sd3: row.SD3,
      sd4: row.SD4,
      dataSource: "WHO",
      version: "2006",
    });
  }

  // Sanity: deduped count must equal raw count — byAgeDays is keyed on a
  // value that we just asserted is unique, so this is a structural check
  // that the map did not silently drop anything.
  if (byAgeDays.size !== data.length) {
    throw new Error(
      `seed-who: ${filename} dedup dropped rows ` +
        `(${data.length} -> ${byAgeDays.size}); this should be impossible.`
    );
  }

  return [...byAgeDays.values()];
}

// ------------------------------------------------------------
// Main
// ------------------------------------------------------------

export async function seedWHOGrowthData(dataDir?: string): Promise<void> {
  const startedAt = Date.now();
  const baseDir = resolveWhoDataDir(dataDir);

  logger.set({ event: "seed_started", dataDir: baseDir });

  if (!fs.existsSync(baseDir)) {
    const err = new Error(`WHO data directory not found: ${baseDir}`);
    logger.error(err);
    logger.emit({ event: "seed_failed" });
    throw err;
  }

  // 1. Truncate existing rows
  await db.delete(whoGrowthData);
  logger.set({ event: "truncated" });

  let totalInserted = 0;
  let datasetsLoaded = 0;

  // 2. For each JSON file -> inject gender + metricType -> insert
  for (const [filename, meta] of Object.entries(DATA_FILES)) {
    const filePath = path.join(baseDir, filename);

    if (!fs.existsSync(filePath)) {
      logger.warn("file_missing", { file: filename });
      continue;
    }

    const raw = readJsonFile(filePath);
    if (raw.length === 0) {
      logger.warn("file_empty", { file: filename });
      continue;
    }

    const rows = buildRows(raw, meta.gender, meta.type, filename);
    const inserted = await batchInsert(rows);
    totalInserted += inserted;
    datasetsLoaded++;

    const ageDays = rows.map((r) => r.ageDays ?? 0);
    const minDay = Math.min(...ageDays);
    const maxDay = Math.max(...ageDays);

    logger.set({
      event: "dataset_inserted",
      gender: meta.gender,
      metricType: meta.type,
      inserted,
      ageDaysRange: `${minDay}..${maxDay}`,
    });
  }

  if (datasetsLoaded === 0) {
    const err = new Error("No WHO growth datasets were parsed");
    logger.error(err);
    logger.emit({ event: "seed_failed" });
    throw err;
  }

  // 3. Verify
  const countResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(whoGrowthData);

  logger.set({
    event: "seed_completed",
    durationMs: Date.now() - startedAt,
    datasets: datasetsLoaded,
    totalInserted,
    databaseCount: countResult[0]?.count ?? 0,
  });

  logger.emit();
}

if (import.meta.main) {
  seedWHOGrowthData()
    .catch((error: unknown) => {
      console.error("❌ WHO seed failed:", error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await closeConnection();
    });
}
