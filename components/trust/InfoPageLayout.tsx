import Link from "next/link";
import type { ReactNode } from "react";
import HelpNav from "@/components/trust/HelpNav";
import LegalFooter from "@/components/trust/LegalFooter";

type InfoPageLayoutProps = {
  title: string;
  eyebrow?: string;
  description: string;
  variant?: "manual" | "rules" | "legal" | "support" | "cookies";
  icon?: string;
  lastUpdated?: string;
  children: ReactNode;
};

export default function InfoPageLayout({
  title,
  eyebrow = "Trust Foundation",
  description,
  variant = "manual",
  icon = "icon-legal.svg",
  lastUpdated,
  children,
}: InfoPageLayoutProps) {
  return (
    <main className={`trust-page trust-page-${variant}`}>
      <div className="trust-page-shade" />
      <div className="trust-shell">
        <aside className="trust-sidebar">
          <Link href="/menu" className="trust-back-link">
            Back to Menu
          </Link>
          <div className="mt-5">
            <HelpNav />
          </div>
        </aside>

        <section className="trust-content">
          <div className="trust-page-header">
            <img
              src={`/images/trust/${icon}`}
              alt=""
              className="trust-page-icon"
            />
            <div>
              <p className="trust-eyebrow">{eyebrow}</p>
              <h1>{title}</h1>
              <p>{description}</p>
              {lastUpdated && (
                <p className="trust-last-updated">
                  Last updated: {lastUpdated}
                </p>
              )}
            </div>
          </div>

          <div className="trust-notice">
            Review game rules, odds, privacy choices, and support options
            before relying on account progress or rewards.
          </div>

          <div className={`trust-page-body trust-panel trust-panel-${variant}`}>
            {children}
          </div>
        </section>
      </div>

      <LegalFooter />
    </main>
  );
}
