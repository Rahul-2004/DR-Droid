const DEFAULT_TIMEOUT_MS = 60_000;

export async function fetchWithTimeout(
  input: string | URL,
  init: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
) {
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  const signal = init.signal
    ? AbortSignal.any([init.signal, timeoutSignal])
    : timeoutSignal;

  try {
    return await fetch(input, { ...init, signal });
  } catch (error) {
    if (signal.aborted) {
      throw new Error(`Request timed out after ${Math.ceil(timeoutMs / 1000)} seconds`);
    }

    const cause = error instanceof Error && error.cause instanceof Error
      ? `: ${error.cause.message}`
      : "";
    throw new Error(`Network request failed${cause}`);
  }
}

export async function errorMessage(response: Response, fallback: string) {
  const body = await response.json().catch(() => null) as
    | { error?: { message?: string } | string; message?: string }
    | null;
  if (typeof body?.error === "string") return body.error;
  return body?.error?.message ?? body?.message ?? `${fallback} (${response.status})`;
}
