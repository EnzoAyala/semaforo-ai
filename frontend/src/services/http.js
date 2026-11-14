/** Helpers HTTP pequeños para la API. */

export async function readErrorDetail(res, fallback) {
  try {
    const err = await res.json();
    if (err.detail) return err.detail;
  } catch {
    // ignore
  }
  return fallback;
}
