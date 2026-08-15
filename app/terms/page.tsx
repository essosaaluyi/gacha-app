import InfoPageLayout from "@/components/trust/InfoPageLayout";
import ManualSection from "@/components/trust/ManualSection";

export default function TermsPage() {
  return (
    <InfoPageLayout
      title="Terms of Use"
      description="These Terms explain the rules for using Gacha Battle, including account use, guest mode, points, rewards, fair play, game content, service changes, and support limits."
      variant="legal"
      icon="icon-terms.svg"
      lastUpdated="2026-06-28"
    >
      <ManualSection title="Acceptance of Terms">
        <p>
          By accessing or using Gacha Battle, you agree to these Terms of Use
          and any additional rules shown in the app, including Rules / Odds /
          Point Rules, Privacy Policy, Cookie Policy, and reward-specific terms
          where applicable.
        </p>
        <p>If you do not agree, do not use the service.</p>
      </ManualSection>

      <ManualSection title="Account Use">
        <p>
          You are responsible for activity on your account. Keep your login
          information secure and do not share access with others.
        </p>
        <p>
          Certain features may require login, including long-term saving, reward
          exchange, support recovery, or account-specific events.
        </p>
      </ManualSection>

      <ManualSection title="Guest Mode">
        <p>
          Guest mode lets you try the game without creating a full account.
          Guest progress may be stored in your browser and may be lost if
          browser storage is cleared, blocked, or unavailable.
        </p>
        <p>
          Guest data may not transfer across devices or browsers. Support may be
          unable to recover lost guest points, inventory, or battle history.
        </p>
      </ManualSection>

      <ManualSection title="Points and Rewards">
        <p>
          Points are an in-game feature. Points may be earned, granted,
          adjusted, or spent according to the current game rules.
        </p>
        <ul className="trust-list">
          <li>Points have no cash value unless a reviewed reward program states otherwise.</li>
          <li>Points cannot be redeemed for cash.</li>
          <li>Points cannot be sold, transferred, traded, or exchanged outside approved app features.</li>
          <li>Points and rewards may be limited by account, guest status, event, region, availability, fraud prevention, or technical requirements.</li>
        </ul>
      </ManualSection>

      <ManualSection title="Pulls, Odds, and Random Results">
        <p>
          Card pulls and battle results may use randomized systems. Current odds
          should be shown on the Rules / Odds page before any point-costing or
          paid action. Visual effects do not guarantee a specific result unless
          the result is already shown in the app.
        </p>
      </ManualSection>

      <ManualSection title="Acceptable Behavior">
        <p>You agree not to use bots, automation, cheats, exploits, or unauthorized tools.</p>
        <p>
          You also agree not to manipulate points, rewards, pulls, odds,
          inventory, battle results, or daily rewards; interfere with app
          security; submit false support requests; or sell or trade accounts,
          points, cards, or rewards outside approved features.
        </p>
      </ManualSection>

      <ManualSection title="Game Content Ownership">
        <p>
          The app, game systems, art, designs, code, characters, names, UI,
          animations, videos, text, and other content are owned by the operator
          or its licensors.
        </p>
        <p>
          Using the service gives you limited permission to access and play the
          game for personal use according to these Terms.
        </p>
      </ManualSection>

      <ManualSection title="Service Changes and Disclaimers">
        <p>
          We may update, balance, suspend, or discontinue parts of the service,
          including game rules, card pools, odds, point values, rewards, events,
          features, and availability.
        </p>
        <p>
          The service is provided on an &quot;as is&quot; and &quot;as available&quot; basis. We do
          not guarantee that the service will always be available, error-free,
          uninterrupted, secure, or compatible with every device or browser.
        </p>
      </ManualSection>

      <ManualSection title="Suspension, Termination, and Contact">
        <p>
          We may suspend or terminate access, correct balances, remove rewards,
          or limit features if we believe a player violated these Terms, abused
          the service, created risk, or if required for legal, security, or
          operational reasons.
        </p>
        <p>Terms and support questions may be sent through the Support page.</p>
      </ManualSection>
    </InfoPageLayout>
  );
}
