import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

export interface SelectionContextValue {
  selectedIds: ReadonlySet<number>;
  size: number;
  isSelected: (id: number) => boolean;
  toggle: (id: number) => void;
  select: (id: number) => void;
  unselect: (id: number) => void;
  selectMany: (ids: number[]) => void;
  unselectMany: (ids: number[]) => void;
  clear: () => void;
  maxSize: number;
  isAtMaxSize: boolean;
}

const SelectionContext = createContext<SelectionContextValue | null>(null);

export const BATCH_PUBLISH_MAX_SIZE = 20;

interface SelectionProviderProps {
  children: ReactNode;
  maxSize?: number;
}

export function SelectionProvider({ children, maxSize = BATCH_PUBLISH_MAX_SIZE }: SelectionProviderProps) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set());

  const select = useCallback((id: number) => {
    setSelectedIds((prev) => {
      if (prev.has(id) || prev.size >= maxSize) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, [maxSize]);

  const unselect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const toggle = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < maxSize) {
        next.add(id);
      }
      return next;
    });
  }, [maxSize]);

  const selectMany = useCallback((ids: number[]) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (next.size >= maxSize) break;
        next.add(id);
      }
      return next;
    });
  }, [maxSize]);

  const unselectMany = useCallback((ids: number[]) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.delete(id);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setSelectedIds((prev) => (prev.size === 0 ? prev : new Set()));
  }, []);

  const isSelected = useCallback((id: number) => selectedIds.has(id), [selectedIds]);

  const value = useMemo<SelectionContextValue>(() => ({
    selectedIds,
    size: selectedIds.size,
    isSelected,
    toggle,
    select,
    unselect,
    selectMany,
    unselectMany,
    clear,
    maxSize,
    isAtMaxSize: selectedIds.size >= maxSize,
  }), [selectedIds, isSelected, toggle, select, unselect, selectMany, unselectMany, clear, maxSize]);

  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>;
}

export function useSelection(): SelectionContextValue {
  const ctx = useContext(SelectionContext);
  if (!ctx) {
    throw new Error('useSelection must be used within <SelectionProvider>');
  }
  return ctx;
}
