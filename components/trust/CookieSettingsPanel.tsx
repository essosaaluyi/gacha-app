"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_COOKIE_PREFERENCES,
  loadCookiePreferences,
  saveCookiePreferences,
} from "@/lib/trust/cookiePreferences";

export default function CookieSettingsPanel() {
  const [essential] = useState(true);
  const [preferences, setPreferences] = useState(
    DEFAULT_COOKIE_PREFERENCES.preferences
  );
  const [savedMessage, setSavedMessage] = useState("");

  // Read on mount rather than in useState so the server and client render the
  // same markup during hydration.
  useEffect(() => {
    setPreferences(loadCookiePreferences().preferences);
  }, []);

  const handleSave = () => {
    const stored = saveCookiePreferences(preferences);

    if (!stored) {
      setSavedMessage(
        "Your choice could not be stored in this browser, so it will reset when you leave."
      );
      return;
    }

    setSavedMessage(
      preferences
        ? "Your cookie settings have been saved."
        : "Saved. Only necessary cookies and storage will be used."
    );
  };

  const rows = [
    {
      label: "Necessary cookies and storage",
      status: "Always active",
      description:
        "Required for login, account sessions, guest play, point and inventory state, battle state, cookie choice records, and service security. These cannot be turned off in the app.",
      checked: essential,
      locked: true,
      onChange: undefined,
    },
    {
      label: "Preferences",
      status: preferences ? "On" : "Off",
      description:
        "Remembers choices such as BGM, sound, display settings, and other gameplay preferences.",
      checked: preferences,
      locked: false,
      onChange: setPreferences,
    },
    {
      label: "Guest save data",
      status: "Managed by browser",
      description:
        "Guest progress may be stored in this browser. Clearing browser data can remove guest points, inventory, battle history, and settings.",
      checked: true,
      locked: true,
      onChange: undefined,
    },
    {
      label: "Analytics",
      status: "Cookieless",
      description:
        "Vercel Web Analytics counts page visits. It sets no cookie and stores no identifier on your device, so there is no cookie choice to make here.",
      checked: false,
      locked: true,
      onChange: undefined,
    },
    {
      label: "Marketing",
      status: "Not currently used",
      description:
        "Marketing tools are not currently enabled. Settings will be updated before marketing cookies are used.",
      checked: false,
      locked: true,
      onChange: undefined,
    },
  ];

  return (
    <section className="trust-cookie-panel">
      <h2>Cookie Settings Console</h2>
      <p>
        Choose how Gacha Battle may use optional cookies and browser storage.
        Necessary storage is always active because it is needed for login, guest
        saves, game state, security, and core gameplay.
      </p>

      <div className="trust-cookie-list">
        {rows.map((row) => (
          <label key={row.label} className="trust-cookie-row">
            <span>
              <strong>{row.label}</strong>
              <em>{row.status}</em>
              <span>{row.description}</span>
            </span>
            <input
              type="checkbox"
              checked={row.checked}
              disabled={row.locked}
              onChange={(event) => row.onChange?.(event.target.checked)}
            />
          </label>
        ))}
      </div>

      {savedMessage && (
        <p className="trust-cookie-message">{savedMessage}</p>
      )}

      <button
        className="trust-info-button trust-info-button-primary"
        onClick={handleSave}
      >
        Save cookie settings
      </button>
    </section>
  );
}
