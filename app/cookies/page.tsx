import InfoPageLayout from "@/components/trust/InfoPageLayout";
import ManualSection from "@/components/trust/ManualSection";

export default function CookiesPage() {
  return (
    <InfoPageLayout
      title="Cookie Policy"
      description="This page explains how Gacha Battle uses cookies, local storage, and similar browser technologies for login, guest saves, preferences, and optional tools if added later."
      variant="legal"
      icon="icon-cookies.svg"
      lastUpdated="2026-06-28"
    >
      <ManualSection title="What Cookies and Local Storage Are">
        <p>
          Cookies are small files stored by your browser. Local storage is
          browser storage that can remember app data on your device. Similar
          technologies may include session storage, browser cache, pixels, SDK
          identifiers, or device-based storage.
        </p>
      </ManualSection>

      <ManualSection title="Necessary Storage">
        <p>Necessary cookies and local storage may be used for:</p>
        <ul className="trust-list">
          <li>Login and authentication.</li>
          <li>Account session security.</li>
          <li>Guest play and local guest saves.</li>
          <li>Points, inventory, battle state, or history where stored locally.</li>
          <li>Preventing duplicate actions or maintaining game state.</li>
          <li>Security, debugging, and service reliability.</li>
        </ul>
        <p>
          Necessary storage is required for core features. If you block it,
          login, guest mode, gameplay, or saves may not work correctly.
        </p>
      </ManualSection>

      <ManualSection title="Preferences">
        <p>
          Preference storage may remember choices such as BGM or sound settings,
          cookie choices, display preferences, and recent gameplay settings.
        </p>
      </ManualSection>

      <ManualSection title="Guest Save Data">
        <p>
          Guest mode may store gameplay data in your browser, including guest
          ID, points, inventory, deck order, battle state, history, and settings.
        </p>
        <p>
          Guest data may be deleted if you clear browser data or use another
          browser/device.
        </p>
      </ManualSection>

      <ManualSection title="Analytics and Marketing">
        <p>
          Analytics cookies are not currently enabled. If analytics tools are
          added, we should explain the provider, purpose, data collected,
          retention, and whether consent is required.
        </p>
        <p>
          Marketing cookies are not currently enabled. If marketing,
          advertising, retargeting, or tracking pixels are added, settings and
          policy text should be updated before use where required.
        </p>
      </ManualSection>

      <ManualSection title="Managing Cookies">
        <p>
          You can manage cookies through your browser settings. You can also use
          Cookie Settings in the app for supported choices.
        </p>
        <p>
          Blocking or deleting necessary storage may sign you out, reset guest
          data, remove preferences, or break gameplay.
        </p>
      </ManualSection>
    </InfoPageLayout>
  );
}
