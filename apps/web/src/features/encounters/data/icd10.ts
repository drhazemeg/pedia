// apps/web/src/features/encounters/data/icd10-pediatric.ts

/**
 * A curated subset of ICD-10 codes relevant to pediatric primary care.
 *
 * Not exhaustive. If a diagnosis isn't in this list, the combobox allows
 * free-text entry (the assessment section stores `{ code, description }`
 * and doesn't require a canonical code). The list exists to make the
 * common case fast — a doctor shouldn't have to type an ICD-10 code by
 * hand for "acute otitis media".
 *
 * Order is alphabetical by description within each category; the search
 * function re-sorts by relevance anyway.
 */

export interface Icd10Entry {
  code: string;
  description: string;
}

export const PEDIATRIC_ICD10: readonly Icd10Entry[] = [
  // ── Infectious / ENT ─────────────────────────────────────────────
  { code: "H66.001", description: "Acute suppurative otitis media, right ear" },
  { code: "H66.002", description: "Acute suppurative otitis media, left ear" },
  {
    code: "H65.191",
    description: "Other acute nonsuppurative otitis media, right",
  },
  { code: "J02.9", description: "Acute pharyngitis, unspecified" },
  { code: "J03.90", description: "Acute tonsillitis, unspecified" },
  {
    code: "J06.9",
    description: "Acute upper respiratory infection, unspecified",
  },
  { code: "J20.9", description: "Acute bronchitis, unspecified" },
  { code: "J21.0", description: "Acute bronchiolitis due to RSV" },
  { code: "J45.909", description: "Unspecified asthma, uncomplicated" },
  {
    code: "J45.901",
    description: "Unspecified asthma with acute exacerbation",
  },
  { code: "B34.9", description: "Viral infection, unspecified" },
  { code: "A09", description: "Infectious gastroenteritis and colitis" },
  { code: "L20.9", description: "Atopic dermatitis, unspecified" },
  { code: "L22", description: "Diaper dermatitis" },
  { code: "B30.9", description: "Viral conjunctivitis, unspecified" },

  // ── Respiratory ──────────────────────────────────────────────────
  { code: "R05.9", description: "Cough, unspecified" },
  { code: "R06.02", description: "Shortness of breath" },
  { code: "R06.2", description: "Wheezing" },

  // ── GI / Feeding ─────────────────────────────────────────────────
  { code: "R11.0", description: "Nausea" },
  { code: "R11.2", description: "Nausea with vomiting" },
  { code: "R10.9", description: "Unspecified abdominal pain" },
  { code: "K59.00", description: "Constipation, unspecified" },
  { code: "R63.3", description: "Feeding difficulties" },
  { code: "P92.9", description: "Feeding problem of newborn, unspecified" },
  { code: "R62.51", description: "Failure to thrive (child)" },

  // ── Growth / Nutrition ───────────────────────────────────────────
  { code: "E66.9", description: "Obesity, unspecified" },
  { code: "E55.9", description: "Vitamin D deficiency, unspecified" },
  { code: "D50.9", description: "Iron deficiency anemia, unspecified" },
  { code: "E61.1", description: "Iron deficiency" },
  { code: "E50.9", description: "Vitamin A deficiency, unspecified" },

  // ── Neurologic / Developmental ───────────────────────────────────
  { code: "G40.909", description: "Epilepsy, unspecified, not intractable" },
  { code: "G43.909", description: "Migraine, unspecified, not intractable" },
  { code: "F90.9", description: "ADHD, unspecified type" },
  { code: "F84.0", description: "Autistic disorder" },
  { code: "F98.0", description: "Enuresis, unspecified" },
  { code: "F95.9", description: "Tic disorder, unspecified" },
  { code: "R62.0", description: "Delayed milestone in childhood" },

  // ── Musculoskeletal ──────────────────────────────────────────────
  { code: "M25.50", description: "Pain in unspecified joint" },
  { code: "M79.609", description: "Pain in unspecified limb" },
  { code: "M54.5", description: "Low back pain" },

  // ── Allergy / Immunology ─────────────────────────────────────────
  { code: "T78.40", description: "Allergy, unspecified" },
  { code: "L50.9", description: "Urticaria, unspecified" },
  { code: "T78.2", description: "Anaphylactic shock, unspecified" },

  // ── Endocrine / Metabolic ────────────────────────────────────────
  { code: "E03.9", description: "Hypothyroidism, unspecified" },
  {
    code: "E10.9",
    description: "Type 1 diabetes mellitus without complications",
  },
  { code: "E34.9", description: "Endocrine disorder, unspecified" },

  // ── Renal / Genitourinary ────────────────────────────────────────
  { code: "N39.0", description: "Urinary tract infection, site not specified" },
  { code: "N10", description: "Acute pyelonephritis" },
  { code: "N47.9", description: "Disorder of prepuce, unspecified" },

  // ── Skin ─────────────────────────────────────────────────────────
  { code: "L03.90", description: "Cellulitis, unspecified" },
  { code: "L01.00", description: "Impetigo, unspecified" },
  { code: "B35.9", description: "Dermatophytosis, unspecified" },

  // ── Mental / Behavioral ──────────────────────────────────────────
  { code: "F32.9", description: "Major depressive disorder, single episode" },
  { code: "F41.9", description: "Anxiety disorder, unspecified" },
  { code: "Z71.89", description: "Other specified counseling" },

  // ── Well-Child / Preventive ──────────────────────────────────────
  { code: "Z00.129", description: "Encounter for routine child health exam" },
  {
    code: "Z00.121",
    description: "Encounter for routine child exam with abnormal findings",
  },
  { code: "Z23", description: "Encounter for immunization" },
  { code: "Z13.9", description: "Encounter for screening, unspecified" },

  // ── Symptoms / Ill-Defined ───────────────────────────────────────
  { code: "R50.9", description: "Fever, unspecified" },
  { code: "R51.9", description: "Headache, unspecified" },
  { code: "R53.83", description: "Other fatigue" },
  { code: "R42", description: "Dizziness and giddiness" },
  { code: "R19.7", description: "Diarrhea, unspecified" },
];

/**
 * Rank a code against a query. Lower is better.
 *
 * Ranking rules, in order:
 *   1. Exact code match (e.g. typing "J06.9" hits that row first)
 *   2. Code prefix match (e.g. "J06" matches J06.9)
 *   3. Description prefix match (e.g. "acute" matches every "Acute …")
 *   4. Description contains (e.g. "otitis" matches "Acute … otitis media")
 *
 * Returns `null` if nothing matched, so callers can filter cheaply.
 */
export function rankIcd10(entry: Icd10Entry, rawQuery: string): number | null {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return 0;

  const code = entry.code.toLowerCase();
  const description = entry.description.toLowerCase();

  if (code === query) return 0;
  if (code.startsWith(query)) return 1;
  if (description.startsWith(query)) return 2;
  if (description.includes(query)) return 3;
  return null;
}

export function searchIcd10(query: string, limit = 20): Icd10Entry[] {
  if (!query.trim()) return PEDIATRIC_ICD10.slice(0, limit);

  const scored: Array<{ entry: Icd10Entry; rank: number }> = [];
  for (const entry of PEDIATRIC_ICD10) {
    const rank = rankIcd10(entry, query);
    if (rank !== null) scored.push({ entry, rank });
  }

  scored.sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;
    return a.entry.description.localeCompare(b.entry.description);
  });

  return scored.slice(0, limit).map((s) => s.entry);
}
