import Link from "next/link";
import { legalLinks, primaryHelpLinks } from "@/components/trust/trustLinks";

type LegalFooterProps = {
  compact?: boolean;
};

export default function LegalFooter({ compact = false }: LegalFooterProps) {
  return (
    <footer
      className={
        compact
          ? "trust-footer trust-footer-compact"
          : "trust-footer"
      }
    >
      <div
        className={
          compact
            ? "trust-footer-inner trust-footer-inner-compact"
            : "trust-footer-inner"
        }
      >
        {!compact && (
          <div className="trust-footer-copy">
            <p>Gacha Battle</p>
            <p>
              Trust, help, and legal information for players. Review game
              rules, odds, privacy choices, and support options before relying
              on account progress or rewards.
            </p>
          </div>
        )}

        {compact && (
          <p className="trust-footer-compact-copy">
            Rules, odds, privacy, terms, cookies, and support are available from
            the footer. Guest saves may depend on this browser.
          </p>
        )}

        <nav className="trust-footer-links">
          {[...primaryHelpLinks, ...legalLinks].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="trust-footer-link"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
