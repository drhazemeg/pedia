// apps/web/src/features/encounters/hooks/use-icd10-search.ts

import { useMemo, useState } from "react";

import { searchIcd10, type Icd10Entry } from "../data/icd10";

export interface UseIcd10SearchResult {
  query: string;
  setQuery: (q: string) => void;
  results: Icd10Entry[];
  hasResults: boolean;
}

/**
 * Client-side ICD-10 search over the curated pediatric list.
 *
 * Deliberately synchronous — the dataset is small (~80 entries) and the
 * combobox's dropdown needs immediate feedback on every keystroke. When
 * the full ICD-10 database is wired up (server-side search), this hook's
 * signature can stay the same and the implementation swaps to a
 * `useQuery` call.
 */
export function useIcd10Search(initialQuery = ""): UseIcd10SearchResult {
  const [query, setQuery] = useState(initialQuery);

  const results = useMemo(() => searchIcd10(query, 20), [query]);

  return {
    query,
    setQuery,
    results,
    hasResults: results.length > 0,
  };
}
