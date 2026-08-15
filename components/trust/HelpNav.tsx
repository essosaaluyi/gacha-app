import Link from "next/link";
import { legalLinks, primaryHelpLinks } from "@/components/trust/trustLinks";

export default function HelpNav() {
  return (
    <nav className="trust-help-nav">
      <p className="trust-help-nav-title">
        Trust & Help
      </p>
      <div className="trust-help-nav-list">
        {[...primaryHelpLinks, ...legalLinks].map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="trust-help-nav-link"
          >
            <img src={`/images/trust/${link.icon}`} alt="" />
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
