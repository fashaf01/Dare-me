export async function api<T = { ok: boolean }>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const headers = new Headers(options?.headers);
  if (!(options?.body instanceof FormData))
    headers.set("Content-Type", "application/json");
  const response = await fetch(`/api${path}`, {
    credentials: "same-origin",
    ...options,
    headers,
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error || "Something went wrong. Please try again.");
  return data;
}
export const send = <T = { ok: boolean }>(
  path: string,
  data: unknown = {},
  method = "POST",
) => api<T>(path, { method, body: JSON.stringify(data) });
