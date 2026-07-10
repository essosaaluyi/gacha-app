"use client";

import { useState } from "react";

export default function CookieSettingsPanel() {
  const [essential] = useState(true);
  const [preferences, setPreferences] = useState(true);
  const [savedMessage, setSavedMessage] = useState("");

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
      status: "Not currently used",
      description:
        "Analytics tools are not currently enabled. Settings will be updated before analytics cookies are used.",
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
        onClick={() =>
          setSavedMessage(
            preferences
              ? "Your cookie settings have been saved."
              : "Only necessary cookies and storage will be used."
          )
        }
      >
        Save cookie settings
      </button>
    </section>
  );
}
