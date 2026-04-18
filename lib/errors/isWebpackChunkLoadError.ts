/** True when the error is a failed dynamic import / lazy chunk (common after dev rebuilds). */
export function isWebpackChunkLoadError(error: Error & { digest?: string }): boolean {
  const m = error.message ?? "";
  return (
    m.includes("Failed to load chunk") ||
    m.includes("Loading chunk") ||
    m.includes("ChunkLoadError") ||
    m.includes("Loading CSS chunk")
  );
}
