/**
 * Prepend newValue to existingValue, separated by a blank line.
 * Used when a duplicate key is encountered on create or bulk import.
 */
export function mergeValues(newValue: string, existingValue: string): string {
  const trimmedNew = newValue.trim();
  const trimmedExisting = existingValue.trim();
  if (!trimmedNew) return trimmedExisting;
  if (!trimmedExisting) return trimmedNew;
  return `${trimmedNew}\n\n${trimmedExisting}`;
}
