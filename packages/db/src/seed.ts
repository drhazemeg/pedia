import "varlock/auto-load"; // ← must be the very first import
import { logger } from "@pedia/shared/logger/server";

import { closePool, seedLogger } from "./seed/helper";
import { runSeed } from "./seed/seed";

// ...
export {
  runSeed,
  type SeedOptions,
  type SeedPhaseResult,
  type SeedSummary,
} from "./seed/seed";

// ─────────────────────────────────────────────────────────────
// CLI entry
// ─────────────────────────────────────────────────────────────

async function cli(): Promise<void> {
  try {
    const summary = await runSeed();

    // Log structured metadata for monitoring/debugging
    logger.info("Database seeding completed successfully", {
      phases: summary.phases.map((p) => ({
        counts: p.counts,
        name: p.name,
      })),
      phasesCount: summary.phases.length,
      totalDurationMs: summary.durationMs,
    });

    // Clean human-readable console table/summary for local DX
  } catch (error) {
    seedLogger("seed_cli").error(
      error instanceof Error ? error : new Error(String(error))
    );
    console.error("\n❌ Seeding failed. Check logs above for details.\n");
    throw error;
  } finally {
    await closePool();
  }
}

if (import.meta.main) {
  void cli();
}
