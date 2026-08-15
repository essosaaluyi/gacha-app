import InfoPageLayout from "@/components/trust/InfoPageLayout";
import ManualSection from "@/components/trust/ManualSection";

export default function HowToPlayPage() {
  return (
    <InfoPageLayout
      title="How To Play"
      description="Pull cards, arrange your battle deck, and fight through draw-based encounters. This manual explains the core loop, battle symbols, bonus rounds, points, and save behavior."
      variant="manual"
      icon="icon-manual.svg"
    >
      <ManualSection title="Quick Start">
        <ol className="trust-list">
          <li>
            Pull cards on the gacha screen. Each card has a rarity, and pulled
            cards become part of your available collection.
          </li>
          <li>
            Arrange your battle deck before battle. Your order matters because
            the run uses the selected deck as battle begins.
          </li>
          <li>
            Start battle when your deck is ready. The battle screen shows the
            enemy, draw area, round progress, points, and enemy attack counter.
          </li>
          <li>
            Press Draw to reveal three result slots. One slot is the target
            slot for that draw.
          </li>
          <li>
            Read the result, continue drawing, and watch for battle endings,
            bonus rounds, or other result states.
          </li>
        </ol>
      </ManualSection>

      <ManualSection title="Gacha Pulls">
        <p>
          Gacha pulls use randomized card rarity odds. Reveal animations may
          vary by card or rarity, but the animation does not change the result
          after it has been determined.
        </p>
      </ManualSection>

      <ManualSection title="Battle Deck Order">
        <p>
          Before battle, choose the order of cards you want to bring. Stronger
          or rarer cards may have more dramatic presentation, but battle results
          are controlled by the battle system.
        </p>
      </ManualSection>

      <ManualSection title="Battle Screen">
        <p>
          Each draw reveals three slots. The target slot is the main slot used
          to read the result. Symbols outside the target slot may appear for
          presentation or pattern readability.
        </p>
        <p>
          The enemy attack counter shows how close the enemy is to attacking or
          forcing a dangerous battle event. Different enemies may use different
          counter values.
        </p>
      </ManualSection>

      <ManualSection title="Symbols and Special Modes">
        <ul className="trust-list">
          <li>
            <strong>Attack:</strong> advances battle pressure against the enemy
            and may award battle or bonus points where enabled.
          </li>
          <li>
            <strong>Defense:</strong> may protect the run or respond to enemy
            pressure.
          </li>
          <li>
            <strong>Coin:</strong> is a points-related symbol and may contribute
            to reward flow where enabled.
          </li>
          <li>
            <strong>Reply:</strong> represents a counter-response and may create
            a battle response event.
          </li>
          <li>
            <strong>Chance:</strong> signals a special opportunity. Single,
            Double, and Triple Chance are different result tiers.
          </li>
          <li>
            <strong>Bar:</strong> is a rare special symbol that may trigger a
            special result depending on battle state.
          </li>
          <li>
            <strong>Empty:</strong> means the draw did not create a major
            result, though the battle may still move forward.
          </li>
        </ul>
        <p>
          Fatal Mode is a high-pressure state that may appear when the battle
          reaches a dangerous condition. While active, presentation becomes more
          intense and the next draws may carry higher stakes.
        </p>
        <p>
          Bonus rounds are special draw sequences that may award extra points or
          trigger reset outcomes.
        </p>
      </ManualSection>

      <ManualSection title="Points and Saves">
        <p>
          Points are the in-game balance used for supported game actions and
          rewards where available. Points are for in-game use only and have no
          cash value unless a legally reviewed reward program says otherwise.
        </p>
        <p>
          Guest play may save progress in the browser on the current device.
          Guest data can be lost if browser storage is cleared, private browsing
          is used, the device changes, or site storage is reset.
        </p>
        <p>
          A member account can save supported progress to the account profile
          after login. Sign in before relying on long-term progress.
        </p>
      </ManualSection>
    </InfoPageLayout>
  );
}
