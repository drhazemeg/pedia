import { useCallback, useState } from "react";

import { useDebounce } from "./use-debounce";

export function useListTableState() {
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounce(searchInput, 300);
  const [pageIndex, setPageIndex] = useState(0);

  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
    setPageIndex(0);
  }, []);

  const resetPage = useCallback(() => setPageIndex(0), []);

  return {
    searchInput,
    search,
    pageIndex,
    setPageIndex,
    handleSearchChange,
    resetPage,
  };
}
