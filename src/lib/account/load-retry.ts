/** Only for account loading and its idempotent setup RPC, never payments. */
export async function retryAccountLoad<T extends { error: unknown; status?: number }>(load: () => PromiseLike<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      const result = await load();
      if (attempt === 0 && result.error && temporary(result.error, result.status)) continue;
      return result;
    } catch (error) {
      if (attempt === 0 && temporary(error)) continue;
      throw error;
    }
  }
}

function temporary(error: unknown, status?: number) {
  const row = error && typeof error === "object" ? error as { code?: string; message?: string; status?: number } : {};
  const httpStatus = status ?? row.status;
  if (httpStatus === 401 || httpStatus === 403 || row.code === "42501") return false;
  return (httpStatus !== undefined && [500, 502, 503, 504].includes(httpStatus))
    || ["57014", "PGRST000", "PGRST001", "PGRST002", "PGRST003"].includes(row.code ?? "")
    || /fetch failed|failed to fetch|networkerror|network request failed|connection reset|timeout|timed out/i.test(row.message ?? "");
}
