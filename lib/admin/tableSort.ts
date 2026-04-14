/** Tri-state column sort: inactive → high-to-low → low-to-high → inactive. */

export type SortTriPhase = 0 | 1 | 2;

export function cycleSortTriPhase(
  columnKey: string,
  currentKey: string | null,
  currentPhase: SortTriPhase,
): { key: string | null; phase: SortTriPhase } {
  if (currentKey !== columnKey) {
    return { key: columnKey, phase: 1 };
  }
  const next = ((currentPhase + 1) % 3) as SortTriPhase;
  if (next === 0) {
    return { key: null, phase: 0 };
  }
  return { key: columnKey, phase: next };
}

/** phase 1 = descending (high → low), phase 2 = ascending */
export function triPhaseToDir(phase: SortTriPhase): "asc" | "desc" | null {
  if (phase === 0) return null;
  return phase === 1 ? "desc" : "asc";
}
