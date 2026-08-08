import InfoPageLayout from "@/components/trust/InfoPageLayout";
import ManualSection from "@/components/trust/ManualSection";

export default function PrivacyPage() {
  return (
    <InfoPageLayout
      title="Privacy Policy"
      description="This policy explains what information may be collected when you use Gacha Battle, how it may be used, how guest browser data works, and how to contact us about privacy questions."
      variant="legal"
      icon="icon-privacy.svg"
      lastUpdated="2026-06-28"
    >
      <ManualSection title="Plain-Language Summary">
        <p>
          We collect or store information needed to run the game, save progress,
          manage accounts, provide support, and protect the service. If you play
          as a guest, some data may be stored in your browser instead of an
          account. If you sign in, supported progress may be connected to your
          account.
        </p>
      </ManualSection>

      <ManualSection title="Information We Collect">
        <p>
          Account data may include email address, login provider information,
          user ID, display name, session information, and authentication
          records.
        </p>
        <p>
          Guest and local browser data may include guest ID, points, inventory,
          battle state, preferences, and other local save data.
        </p>
        <p>
          Gameplay data may include points, card inventory, pull history, battle
          history, reward history, daily reward claims, deck order, result
          history, and related gameplay records.
        </p>
      </ManualSection>

      <ManualSection title="Cookies, Local Storage, and Support Messages">
        <p>
          We use cookies, local storage, or similar technologies to keep you
          signed in, remember preferences, support guest play, store game state,
          and operate security features.
        </p>
        <p>
          If you contact support, we may collect your message, contact details,
          issue category, screenshots or files you provide, account or guest ID,
          browser/device information, and issue history.
        </p>
      </ManualSection>

      <ManualSection title="Technical Data">
        <p>
          We may collect basic technical information needed to operate, secure,
          and debug the service, such as browser type, device type, timestamps,
          page activity, error logs, and approximate region.
        </p>
        <p>
          We use Vercel Web Analytics to count page visits while the game is in
          development. It is cookieless and does not use device fingerprinting,
          does not store an identifier on your device, and does not build a
          profile of you or follow you across other sites.
        </p>
        <p>
          Marketing, advertising, and retargeting tools are not currently
          enabled. If they are added later, this policy and the Cookie Policy
          should be updated first.
        </p>
      </ManualSection>

      <ManualSection title="How We Use Information">
        <ul className="trust-list">
          <li>Operate gameplay, gacha pulls, battles, inventories, points, and rewards.</li>
          <li>Save account or guest progress.</li>
          <li>Provide login and account security.</li>
          <li>Respond to support requests.</li>
          <li>Investigate bugs, lost points, reward issues, or suspicious activity.</li>
          <li>Improve game balance, usability, and reliability.</li>
          <li>Enforce rules and protect the service.</li>
        </ul>
      </ManualSection>

      <ManualSection title="Guest Data and Browser Storage">
        <p>
          Guest data may be stored on the device and browser you use. It may not
          be recoverable if you clear cookies or local storage, use private
          browsing, change browsers or devices, block storage, or reset app
          storage.
        </p>
      </ManualSection>

      <ManualSection title="Retention, Choices, and Contact">
        <p>
          We keep information only as long as needed for the purposes described
          in this policy, unless a longer period is required for legal, security,
          support, accounting, or dispute reasons.
        </p>
        <p>
          Depending on where you live, you may have rights to access, correct,
          delete, export, restrict, or object to certain uses of your personal
          information.
        </p>
        <p>Privacy questions may be sent through the Support page.</p>
      </ManualSection>
    </InfoPageLayout>
  );
}
