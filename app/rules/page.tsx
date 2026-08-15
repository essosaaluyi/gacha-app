import InfoPageLayout from "@/components/trust/InfoPageLayout";
import ManualSection from "@/components/trust/ManualSection";
import RulesOddsSection from "@/components/trust/RulesOddsSection";

export default function RulesPage() {
  return (
    <InfoPageLayout
      title="Rules / Odds / Point Rules"
      description="Review pull costs, rarity odds, battle result transparency, point earning and spending, daily rewards, guest limitations, and fair play expectations."
      variant="rules"
      icon="icon-rules.svg"
      lastUpdated="2026-06-28"
    >
      <RulesOddsSection
        title="Pull Costs"
        rows={[
          {
            label: "Single pull cost",
            value: "No point cost is currently configured during this test build.",
          },
          {
            label: "Ten-pull cost",
            value: "No point cost is currently configured during this test build.",
          },
          {
            label: "Battle entry cost",
            value: "No point cost is currently configured during this test build.",
          },
        ]}
      />

      <RulesOddsSection
        title="Card Rarity Odds"
        rows={[
          { label: "R", value: "60%" },
          { label: "SR", value: "25%" },
          { label: "SSR", value: "10%" },
          { label: "UR", value: "5%" },
        ]}
      />

      <ManualSection title="Battle Result Odds">
        <p>
          Battle result odds are being reviewed during balancing. If battle
          results affect points, rewards, or paid actions, the final odds will
          be published here before public launch.
        </p>
        <p>
          Reveal animations, videos, sound effects, and visual effects do not
          change a pull or battle result after it has been determined.
        </p>
      </ManualSection>

      <ManualSection title="Point Earning">
        <p>
          Players may earn points through eligible actions such as battle
          results, bonus rounds, daily rewards, card returns where enabled, or
          special events where announced.
        </p>
      </ManualSection>

      <ManualSection title="Point Spending">
        <p>
          Points may be spent only on approved in-game actions or reward
          exchange items shown in the app. If a pull, battle entry, item, or
          exchange costs points, the app should show the cost before the player
          confirms.
        </p>
        <p>
          Points are a game feature and are not money, stored value, or a cash
          account. Points cannot be sold, transferred, redeemed for cash, or
          exchanged outside the app unless a specific reward program clearly
          says otherwise.
        </p>
      </ManualSection>

      <RulesOddsSection
        title="Daily Rewards"
        rows={[
          {
            label: "Current test build",
            value:
              "Daily reward values are not currently configured for this test build.",
          },
          {
            label: "Eligibility",
            value:
              "A daily reward may be limited to one claim per day, per account, browser, device, or other anti-abuse measure.",
          },
        ]}
      />

      <ManualSection title="Guest Limitations">
        <p>
          Guest players can try the game without a full account, but guest
          progress may be stored only in the browser. Guest points, inventory,
          battle history, and settings may be lost if browser storage is cleared
          or unavailable.
        </p>
      </ManualSection>

      <ManualSection title="Fair Play">
        <p>Players should not use bots, scripts, automation, exploits, or unauthorized tools.</p>
        <p>
          We may investigate suspicious activity and may limit, correct,
          suspend, or remove access to points, rewards, or accounts when needed
          to protect the service.
        </p>
      </ManualSection>
    </InfoPageLayout>
  );
}
