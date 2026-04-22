import { PostgrestError } from "@supabase/supabase-js";

export function isPostgrestError(error: unknown): error is PostgrestError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "message" in error &&
    "details" in error
  );
}

export function isMissingColumnError(
  error: PostgrestError,
  columnName?: string
) {
  const message = error.message.toLowerCase();
  const baseCondition =
    message.includes("column") && message.includes("does not exist");
  if (!columnName) return baseCondition;
  return baseCondition && message.includes(columnName.toLowerCase());
}
