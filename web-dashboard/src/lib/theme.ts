export type ThemeMode = "dark" | "light";

export function resolveTheme(
  stored: string | null | undefined,
  systemPrefersDark: boolean
): ThemeMode {
  if (stored === "dark" || stored === "light") {
    return stored;
  }
  return systemPrefersDark ? "dark" : "light";
}
