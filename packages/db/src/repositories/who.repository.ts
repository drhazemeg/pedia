// src/lib/db/repositories/who.repository.ts

import type { DB, DBOrTx, Transaction } from "@pedia/db";
import { db, withTransaction } from "@pedia/db";
import { queryCache } from "@pedia/db/cache";
import { getPercentilesFromLMS, type LMSParameters } from "@pedia/shared";
import { and, asc, eq } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";

import { type MetricType, whoGrowthData } from "../schema";
import type { NewWhoGrowthData, WhoGrowthData } from "../schema/types";
import { BaseRepository } from "./base.repository";

// ============================================================
// Constants
// ============================================================

/**
 * 7 days, in milliseconds. WHO growth reference tables are static — the
 * upstream data changes at the cadence of a new WHO publication, not per
 * request — so a long TTL is safe and keeps the hot path off the DB.
 */
const CACHE_TTL_MS = 60 * 60 * 24 * 7 * 1000;

const WHO_CACHE_TAG = "who_growth";
const WHO_PERCENTILE_CURVE_TAG = "who:percentile_curve";

// ============================================================
// Types
// ============================================================

type Gender = "male" | "female";

type PercentileRow = {
  ageMonths: number;
  p3: number;
  p15: number;
  p50: number;
  p85: number;
  p97: number;
};

type AgeRange = { min: number; max: number };

// ============================================================
// Repository
// ============================================================

export class WhoGrowthRepository extends BaseRepository {
  protected readonly table = whoGrowthData;
  protected readonly idColumn: PgColumn = whoGrowthData.id;
  protected readonly tableName = "whoGrowthData";

  constructor(database: DB | Transaction | DBOrTx = db) {
    super(database);
  }

  // --------------------------------------------------------------------------
  // Reads
  // --------------------------------------------------------------------------

  async getAll(): Promise<WhoGrowthData[]> {
    const cacheKey = "who_growth:all";
    const cached = queryCache.get<WhoGrowthData[]>(cacheKey);
    if (cached) return cached;

    const result = await this.db
      .select()
      .from(whoGrowthData)
      .orderBy(asc(whoGrowthData.ageMonths));

    queryCache.set(cacheKey, result, {
      ttl: CACHE_TTL_MS,
      tags: [WHO_CACHE_TAG],
    });

    return result;
  }

  async getByGenderAndMetric(
    gender: Gender,
    metricType: MetricType
  ): Promise<WhoGrowthData[]> {
    const cacheKey = `who_growth:${gender}:${metricType}`;
    const cached = queryCache.get<WhoGrowthData[]>(cacheKey);
    if (cached) return cached;

    const result = await this.db
      .select()
      .from(whoGrowthData)
      .where(
        and(
          eq(whoGrowthData.gender, gender),
          eq(whoGrowthData.metricType, metricType)
        )
      )
      .orderBy(asc(whoGrowthData.ageMonths));

    queryCache.set(cacheKey, result, {
      ttl: CACHE_TTL_MS,
      tags: [WHO_CACHE_TAG, `who_growth:${gender}`, `who_growth:${metricType}`],
    });

    return result;
  }

  async getLMSParameters(
    gender: Gender,
    metricType: MetricType,
    ageMonths: number
  ): Promise<LMSParameters | null> {
    const data = await this.getByGenderAndMetric(gender, metricType);
    if (data.length === 0) return null;

    const [first] = data;
    if (!first) return null;

    if (ageMonths <= first.ageMonths) {
      return {
        ageMonths: first.ageMonths,
        L: first.L,
        M: first.M,
        S: first.S,
      };
    }

    const last = data.at(-1);
    if (!last) return null;

    if (ageMonths >= last.ageMonths) {
      return {
        ageMonths: last.ageMonths,
        L: last.L,
        M: last.M,
        S: last.S,
      };
    }

    for (let i = 0; i < data.length - 1; i += 1) {
      const p1 = data[i];
      const p2 = data[i + 1];
      if (!(p1 && p2)) continue;
      if (ageMonths >= p1.ageMonths && ageMonths <= p2.ageMonths) {
        const span = p2.ageMonths - p1.ageMonths;
        if (span === 0) {
          return {
            ageMonths: p1.ageMonths,
            L: p1.L,
            M: p1.M,
            S: p1.S,
          };
        }
        const t = (ageMonths - p1.ageMonths) / span;
        return {
          ageMonths,
          L: p1.L + t * (p2.L - p1.L),
          M: p1.M + t * (p2.M - p1.M),
          S: p1.S + t * (p2.S - p1.S),
        };
      }
    }

    return null;
  }

  async getAgeRange(gender: Gender, metricType: MetricType): Promise<AgeRange> {
    const data = await this.getByGenderAndMetric(gender, metricType);

    const [first] = data;
    const last = data.at(-1);
    if (!(first && last)) return { min: 0, max: 0 };

    return { min: first.ageMonths, max: last.ageMonths };
  }

  /**
   * Build a percentile curve for the requested ages.
   *
   * Fetches the LMS table ONCE for the `(gender, metricType)` pair and
   * interpolates in memory, rather than calling `getLMSParameters` per age
   * (which — despite the cache — re-enters `getByGenderAndMetric` N times).
   */
  async getPercentileCurve(
    gender: Gender,
    metricType: MetricType,
    ageMonths: number[]
  ): Promise<PercentileRow[]> {
    const normalizedAges = [...new Set(ageMonths)].toSorted((a, b) => a - b);
    const cacheKey = `who:percentile_curve:${gender}:${metricType}:${normalizedAges.join(",")}`;
    const cached = queryCache.get<PercentileRow[]>(cacheKey);
    if (cached) return cached;

    const table = await this.getByGenderAndMetric(gender, metricType);

    const lmsForAge = (age: number): LMSParameters | null => {
      if (table.length === 0) return null;
      const [first] = table;
      if (!first) return null;
      if (age <= first.ageMonths) {
        return {
          ageMonths: first.ageMonths,
          L: first.L,
          M: first.M,
          S: first.S,
        };
      }
      const last = table.at(-1);
      if (!last) return null;
      if (age >= last.ageMonths) {
        return {
          ageMonths: last.ageMonths,
          L: last.L,
          M: last.M,
          S: last.S,
        };
      }
      for (let i = 0; i < table.length - 1; i += 1) {
        const p1 = table[i];
        const p2 = table[i + 1];
        if (!(p1 && p2)) continue;
        if (age >= p1.ageMonths && age <= p2.ageMonths) {
          const span = p2.ageMonths - p1.ageMonths;
          if (span === 0) {
            return {
              ageMonths: p1.ageMonths,
              L: p1.L,
              M: p1.M,
              S: p1.S,
            };
          }
          const t = (age - p1.ageMonths) / span;
          return {
            ageMonths: age,
            L: p1.L + t * (p2.L - p1.L),
            M: p1.M + t * (p2.M - p1.M),
            S: p1.S + t * (p2.S - p1.S),
          };
        }
      }
      return null;
    };

    const results: PercentileRow[] = normalizedAges.map((month) => {
      const lms = lmsForAge(month);
      if (!lms) {
        return {
          ageMonths: month,
          p3: 0,
          p15: 0,
          p50: 0,
          p85: 0,
          p97: 0,
        };
      }
      const percentiles = getPercentilesFromLMS(lms, metricType);
      return {
        ageMonths: month,
        p3: percentiles.p3,
        p15: percentiles.p15,
        p50: percentiles.p50,
        p85: percentiles.p85,
        p97: percentiles.p97,
      };
    });

    queryCache.set(cacheKey, results, {
      ttl: CACHE_TTL_MS,
      tags: [WHO_PERCENTILE_CURVE_TAG, WHO_CACHE_TAG, gender, metricType],
    });

    return results;
  }

  // --------------------------------------------------------------------------
  // Writes
  // --------------------------------------------------------------------------

  async bulkInsert(data: NewWhoGrowthData[]): Promise<WhoGrowthData[]> {
    if (data.length === 0) return [];

    const results = await withTransaction(async (tx: Transaction) =>
      tx.insert(whoGrowthData).values(data).returning()
    );

    queryCache.invalidateTag(WHO_CACHE_TAG);

    return results;
  }

  async upsert(data: NewWhoGrowthData): Promise<WhoGrowthData> {
    const result = await withTransaction(async (tx: Transaction) => {
      const [row] = await tx
        .insert(whoGrowthData)
        .values({ ...data, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: whoGrowthData.id,
          set: {
            gender: data.gender,
            metricType: data.metricType,
            ageDays: data.ageDays,
            ageMonths: data.ageMonths,
            L: data.L,
            M: data.M,
            S: data.S,
            sd4neg: data.sd4neg,
            sd3neg: data.sd3neg,
            sd2neg: data.sd2neg,
            sd1neg: data.sd1neg,
            sd0: data.sd0,
            sd1: data.sd1,
            sd2: data.sd2,
            sd3: data.sd3,
            sd4: data.sd4,
            updatedAt: new Date(),
          },
        })
        .returning();

      if (!row) throw new Error("WHO growth upsert returned no row");
      return row;
    });

    queryCache.invalidateTag(WHO_CACHE_TAG);

    return result;
  }

  // --------------------------------------------------------------------------
  // Cache
  // --------------------------------------------------------------------------

  clearCache(): void {
    queryCache.invalidateTag(WHO_CACHE_TAG);
    queryCache.invalidateTag(WHO_PERCENTILE_CURVE_TAG);
  }
}

export const whoGrowthRepository = new WhoGrowthRepository(db);
