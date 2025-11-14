const missingColumns = new Set();

function columnKey(table, column) {
  return `${String(table || "").toLowerCase()}::${String(column || "").toLowerCase()}`;
}

export function markColumnMissing(table, column) {
  missingColumns.add(columnKey(table, column));
}

export function isColumnMissing(table, column) {
  return missingColumns.has(columnKey(table, column));
}

export function shouldRetryMissingColumn(error, table, column) {
  if (!error) return false;
  const code = String(error.code || "").trim().toUpperCase();
  const matchesCode = code === "42703" || code === "PGRST302" || code === "PGRST204";
  const text = [error.message, error.details, error.hint]
    .filter(Boolean)
    .map((item) => String(item).toLowerCase())
    .join(" | ");
  const matchesText = text ? new RegExp(`\\b${column}\\b`, "i").test(text) : false;
  if (matchesCode || matchesText) {
    markColumnMissing(table, column);
    return true;
  }
  return false;
}

export function shouldRetryWithoutIdx(error) {
  return shouldRetryMissingColumn(error, "scenarios", "idx");
}
