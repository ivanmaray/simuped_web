export function shouldRetryWithoutIdx(error) {
  if (!error) return false;
  const code = String(error.code || "").trim().toUpperCase();
  if (code === "42703" || code === "PGRST302" || code === "PGRST204") {
    return true;
  }
  const text = [error.message, error.details, error.hint]
    .filter(Boolean)
    .map((item) => String(item).toLowerCase())
    .join(" | ");
  if (!text) return false;
  return /\bidx\b/.test(text);
}
