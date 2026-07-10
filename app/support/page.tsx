import InfoPageLayout from "@/components/trust/InfoPageLayout";
import ManualSection from "@/components/trust/ManualSection";
import SupportContactForm from "@/components/trust/SupportContactForm";

export default function SupportPage() {
  return (
    <InfoPageLayout
      title="Support / Contact"
      description="Need help with login, points, rewards, battles, or guest saves? Start here and include the details listed below so support can review your issue faster."
      variant="support"
      icon="icon-support.svg"
    >
      <ManualSection title="Before Contacting Support">
        <ul className="trust-list">
          <li>Refresh the page and check your connection.</li>
          <li>Make sure you are signed in to the correct account.</li>
          <li>If you are a guest, use the same browser and device where you played.</li>
          <li>Check whether the issue is explained on How To Play or Rules / Odds.</li>
          <li>Take a screenshot before closing the page if a result, reward, or point balance looks wrong.</li>
        </ul>
      </ManualSection>

      <ManualSection title="What To Include">
        <p>
          Include your account email or guest ID, issue category, date/time,
          browser/device, screenshots if available, and what happened right
          before the issue.
        </p>
      </ManualSection>

      <ManualSection title="Issue Guides">
        <p>
          For login issues, include account email or login provider, approximate
          time, browser/device, and any error message.
        </p>
        <p>
          For lost points, include current balance, expected balance, the action
          before the change, date/time, and screenshots or history if available.
        </p>
        <p>
          For reward issues, include reward name, point cost, redemption
          date/time, account email or guest ID, and confirmation screenshots.
        </p>
        <p>
          For battle bugs, include enemy name or stage, round number, result
          symbols, whether Chance, Bar, Fatal Mode, or Bonus was active, and
          browser/device details.
        </p>
      </ManualSection>

      <ManualSection title="Guest Data Limitations">
        <p>
          Guest data may depend on browser storage. Support may not be able to
          recover guest progress if cookies or local storage were cleared,
          private browsing was used, storage was blocked, or the device/browser
          changed.
        </p>
      </ManualSection>

      <SupportContactForm />

      <ManualSection title="FAQ">
        <details className="trust-faq-item">
          <summary>Can I play without an account?</summary>
          <p>
            Yes. Guest mode lets you try the game. Guest progress may be stored
            only in your browser and may be lost if browser data is cleared or
            you switch devices.
          </p>
        </details>
        <details className="trust-faq-item">
          <summary>What are the card rarity odds?</summary>
          <p>Current configured rarity odds are R 60%, SR 25%, SSR 10%, and UR 5%.</p>
        </details>
        <details className="trust-faq-item">
          <summary>Do reveal animations change my pull result?</summary>
          <p>
            No. Reveal animations may vary, but they do not change the result
            after it has been determined.
          </p>
        </details>
        <details className="trust-faq-item">
          <summary>What is the target slot?</summary>
          <p>
            Each draw shows three slots. The target slot is the main slot used
            to read the result for that draw.
          </p>
        </details>
        <details className="trust-faq-item">
          <summary>Can I cash out points?</summary>
          <p>
            No. Points are for in-game use only and have no cash value unless a
            legally reviewed reward program says otherwise.
          </p>
        </details>
        <details className="trust-faq-item">
          <summary>Does the app use analytics or marketing cookies?</summary>
          <p>
            Not currently. If analytics or marketing tools are added later, the
            Cookie Policy and Cookie Settings should be updated first.
          </p>
        </details>
      </ManualSection>
    </InfoPageLayout>
  );
}
