// Cookie/storage preference choices made in the Cookie Settings console.
//
// Only "preferences" is an actual choice today. Necessary storage and guest
// saves are required for the game to work, and Vercel Web Analytics is
// cookieless with no device identifier, so neither is gated here.

const STORAGE_KEY = "cookie_preferences_v1";

export type CookiePreferences = {
  /** Remember BGM/sound/display choices between visits. */
  preferences: boolean;
  /** When the choice was recorded, for the "last updated" line. */
  decidedAt: number | null;
};

export const DEFAULT_COOKIE_PREFERENCES: CookiePreferences = {
  preferences: true,
  decidedAt: null,
};

export function loadCookiePreferences(): CookiePreferences {
  if (typeof window === "undefined") return DEFAULT_COOKIE_PREFERENCES;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_COOKIE_PREFERENCES;

    const parsed = JSON.parse(raw) as Partial<CookiePreferences>;

    return {
      preferences:
        typeof parsed.preferences === "boolean"
          ? parsed.preferences
          : DEFAULT_COOKIE_PREFERENCES.preferences,
      decidedAt:
        typeof parsed.decidedAt === "number" ? parsed.decidedAt : null,
    };
  } catch {
    return DEFAULT_COOKIE_PREFERENCES;
  }
}

/** Returns false if the choice could not be written, so the UI can say so. */
export function saveCookiePreferences(preferences: boolean): boolean {
  if (typeof window === "undefined") return false;

  try {
    const next: CookiePreferences = { preferences, decidedAt: Date.now() };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));

    // Note: no preference values are written to storage yet (BGM/sound choices
    // currently live in memory only), so there is nothing to purge when this is
    // switched off. Any future preference writer must check this flag first.
    return true;
  } catch {
    return false;
  }
}
